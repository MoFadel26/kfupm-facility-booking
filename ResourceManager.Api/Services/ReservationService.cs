using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Data;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Exceptions;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Services;

public class ReservationService : IReservationService
{
    private readonly AppDbContext _db;

    public ReservationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<ReservationResponse>> GetAllAsync(ReservationQuery query, CancellationToken ct = default)
    {
        // A filter naming something that does not exist is a client mistake worth
        // reporting, not an empty page that looks like "nobody booked anything".
        if (query.UserId is not null && !await _db.Users.AnyAsync(u => u.KfupmId == query.UserId, ct))
            throw new NotFoundException(nameof(User), query.UserId);

        if (query.FacilityId is not null && !await _db.Facilities.AnyAsync(f => f.FacilityId == query.FacilityId, ct))
            throw new NotFoundException(nameof(Facility), query.FacilityId);

        var reservations = _db.Reservations.AsNoTracking();

        // Both filters apply. They used to be checked one after the other, so asking for
        // a user's bookings at a given facility quietly ignored the facility.
        if (query.UserId is not null)
            reservations = reservations.Where(r => r.UserId == query.UserId);

        if (query.FacilityId is not null)
            reservations = reservations.Where(r => r.FacilityId == query.FacilityId);

        return await reservations
            .OrderBy(r => r.StartTime)
            .ThenBy(r => r.Id)
            .Select(ReservationMappingExtensions.Projection)
            .ToPagedResultAsync(query, ct);
    }

    public async Task<ReservationResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Reservations.AsNoTracking()
            .Where(r => r.Id == id)
            .Select(ReservationMappingExtensions.Projection)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Reservation), id);
    }

    public async Task<ReservationResponse> CreateAsync(CreateReservationRequest request, string actingUserId, CancellationToken ct = default)
    {
        EnsureTimeRangeIsValid(request.StartTime, request.EndTime);

        // 403, not 404: the token is valid but names nobody this API knows, so the caller
        // is not allowed to book. Nothing in the request itself was missing.
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.KfupmId == actingUserId, ct)
                   ?? throw new ForbiddenException($"User '{actingUserId}' named by the token does not exist.");
        var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(f => f.FacilityId == request.FacilityId, ct)
                       ?? throw new NotFoundException(nameof(Facility), request.FacilityId);

        EnsureUserIsEligible(facility, user);
        await EnsureSlotIsFreeAsync(request.FacilityId, request.StartTime, request.EndTime, excludeReservationId: null, ct);

        var reservation = new Reservation(
            reservationId: GenerateReservationId(),
            startTime: request.StartTime,
            endTime: request.EndTime,
            reason: request.Reason.Trim(),
            targetParticipantCount: request.TargetParticipantCount,
            facilityId: request.FacilityId,
            userId: user.KfupmId);

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(reservation.Id, ct);
    }

    public async Task<ReservationResponse> UpdateAsync(Guid id, UpdateReservationRequest request, string actingUserId, CancellationToken ct = default)
    {
        var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == id, ct)
                          ?? throw new NotFoundException(nameof(Reservation), id);

        await EnsureCanChangeAsync(reservation, actingUserId, ct);
        EnsureTimeRangeIsValid(request.StartTime, request.EndTime);
        EnsureTransitionIsAllowed(reservation.Status, request.Status);

        // A cancelled reservation does not occupy the slot, so skip the overlap check for it.
        if (request.Status != ReservationStatus.Cancelled)
            await EnsureSlotIsFreeAsync(reservation.FacilityId, request.StartTime, request.EndTime, excludeReservationId: id, ct);

        reservation.Update(request.StartTime, request.EndTime, request.Reason.Trim(), request.TargetParticipantCount, request.Status);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, string actingUserId, CancellationToken ct = default)
    {
        var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == id, ct)
                          ?? throw new NotFoundException(nameof(Reservation), id);

        await EnsureCanChangeAsync(reservation, actingUserId, ct);

        _db.Reservations.Remove(reservation);
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Only the owner or an admin may change a reservation. The admin role is read from
    /// the Users table rather than a token claim, so demoting someone takes effect on
    /// their next request instead of when their token expires.
    /// </summary>
    private async Task EnsureCanChangeAsync(Reservation reservation, string actingUserId, CancellationToken ct)
    {
        if (reservation.UserId == actingUserId)
            return;

        var isAdmin = await _db.Users.AnyAsync(u => u.KfupmId == actingUserId && u.Role == UserRole.Admin, ct);
        if (!isAdmin)
            throw new ForbiddenException("Only the reservation's owner or an admin can change it.");
    }

    /// <summary>
    /// A reservation moves forward only: Pending -> Confirmed -> Cancelled, and staying put
    /// is always fine. Cancelling releases the slot for someone else, so reviving a
    /// cancelled reservation would hand out a facility twice; the overlap constraint
    /// catches that only when the slot has already been retaken, which makes the outcome
    /// depend on whether anyone happened to rebook. Rejecting the move itself does not.
    /// </summary>
    private static void EnsureTransitionIsAllowed(ReservationStatus current, ReservationStatus requested)
    {
        if (current == requested)
            return;

        var allowed = current switch
        {
            ReservationStatus.Pending => requested is ReservationStatus.Confirmed or ReservationStatus.Cancelled,
            ReservationStatus.Confirmed => requested is ReservationStatus.Cancelled,
            ReservationStatus.Cancelled => false,
            _ => throw new ArgumentOutOfRangeException(
                nameof(current), current, "Unhandled reservation status.")
        };

        if (!allowed)
            throw new ConflictException(
                $"A {current} reservation cannot become {requested}.");
    }

    /// <summary>
    /// Only the rule the request DTOs cannot state. Reason and TargetParticipantCount are
    /// covered by [Required] and [Range], which [ApiController] enforces before this runs;
    /// repeating them here meant two places to change and two chances to disagree.
    /// </summary>
    private static void EnsureTimeRangeIsValid(DateTimeOffset startTime, DateTimeOffset endTime)
    {
        if (endTime <= startTime)
            throw new BadRequestException("EndTime must be after StartTime.");
    }

    internal static void EnsureUserIsEligible(Facility facility, User user)
    {
        if (!IsGenderAllowed(facility.AllowedGender, user.Gender))
            throw new ConflictException($"Facility '{facility.Name}' is restricted to {facility.AllowedGender} users.");

        if (!IsRoleAllowed(facility.AllowedRole, user.Role))
            throw new ConflictException($"Facility '{facility.Name}' is restricted to the {facility.AllowedRole} role.");
    }

    // These used to compare the two enums by name. That worked only for as long as the
    // name sets stayed aligned, and it failed silently — a renamed or added member would
    // start letting the wrong people through with nothing to flag it. The mapping is now
    // explicit, and an unmapped restriction throws rather than quietly allowing or denying.
    private static bool IsGenderAllowed(AllowedGender allowed, Gender gender) => allowed switch
    {
        AllowedGender.Any => true,
        AllowedGender.Male => gender is Gender.Male,
        AllowedGender.Female => gender is Gender.Female,
        _ => throw new ArgumentOutOfRangeException(
            nameof(allowed), allowed, "Unhandled facility gender restriction.")
    };

    private static bool IsRoleAllowed(AllowedRole allowed, UserRole role) => allowed switch
    {
        AllowedRole.Any => true,
        AllowedRole.Faculty => role is UserRole.Faculty,
        AllowedRole.Staff => role is UserRole.Staff,
        AllowedRole.ClubPresident => role is UserRole.ClubPresident,
        AllowedRole.Student => role is UserRole.Student,
        AllowedRole.Admin => role is UserRole.Admin,
        _ => throw new ArgumentOutOfRangeException(
            nameof(allowed), allowed, "Unhandled facility role restriction.")
    };

    private async Task EnsureSlotIsFreeAsync(string facilityId, DateTimeOffset startTime, DateTimeOffset endTime, Guid? excludeReservationId, CancellationToken ct)
    {
        var overlaps = await _db.Reservations.AnyAsync(r =>
            r.FacilityId == facilityId
            && r.Id != excludeReservationId
            && r.Status != ReservationStatus.Cancelled
            && r.StartTime < endTime
            && r.EndTime > startTime, ct);

        if (overlaps)
            throw new ConflictException("The facility is already reserved during the requested time range.");
    }

    /// <summary>
    /// 16 hex digits, 64 random bits. The old 8 digits (32 bits) started colliding with the
    /// unique index once the table held a few hundred thousand rows, and the booking failed
    /// with a 409. At 64 bits a collision is unlikely before billions of rows.
    /// </summary>
    private static string GenerateReservationId()
        => $"RES-{Convert.ToHexString(RandomNumberGenerator.GetBytes(8))}";
}

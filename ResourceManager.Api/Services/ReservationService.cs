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

    public async Task<List<ReservationResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var reservations = await _db.Reservations.AsNoTracking()
            .Include(r => r.Facility)
            .Include(r => r.User)
            .OrderBy(r => r.StartTime)
            .ToListAsync(ct);
        return reservations.Select(r => r.ToResponse()).ToList();
    }

    public async Task<ReservationResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var reservation = await _db.Reservations.AsNoTracking()
            .Include(r => r.Facility)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException(nameof(Reservation), id);
        return reservation.ToResponse();
    }

    public async Task<List<ReservationResponse>> GetByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (!await _db.Users.AnyAsync(u => u.KfupmId == userId, ct))
            throw new NotFoundException(nameof(User), userId);

        var reservations = await _db.Reservations.AsNoTracking()
            .Include(r => r.Facility)
            .Include(r => r.User)
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.StartTime)
            .ToListAsync(ct);
        return reservations.Select(r => r.ToResponse()).ToList();
    }

    public async Task<List<ReservationResponse>> GetByFacilityIdAsync(string facilityId, CancellationToken ct = default)
    {
        if (!await _db.Facilities.AnyAsync(f => f.FacilityId == facilityId, ct))
            throw new NotFoundException(nameof(Facility), facilityId);

        var reservations = await _db.Reservations.AsNoTracking()
            .Include(r => r.Facility)
            .Include(r => r.User)
            .Where(r => r.FacilityId == facilityId)
            .OrderBy(r => r.StartTime)
            .ToListAsync(ct);
        return reservations.Select(r => r.ToResponse()).ToList();
    }

    public async Task<ReservationResponse> CreateAsync(CreateReservationRequest request, CancellationToken ct = default)
    {
        ValidateFields(request.StartTime, request.EndTime, request.Reason, request.TargetParticipantCount);

        var facility = await _db.Facilities.AsNoTracking().FirstOrDefaultAsync(f => f.FacilityId == request.FacilityId, ct)
                       ?? throw new NotFoundException(nameof(Facility), request.FacilityId);
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.KfupmId == request.UserId, ct)
                   ?? throw new NotFoundException(nameof(User), request.UserId);

        EnsureUserIsEligible(facility, user);
        await EnsureSlotIsFreeAsync(request.FacilityId, request.StartTime, request.EndTime, excludeReservationId: null, ct);

        var reservation = new Reservation(
            reservationId: GenerateReservationId(),
            startTime: request.StartTime,
            endTime: request.EndTime,
            reason: request.Reason.Trim(),
            targetParticipantCount: request.TargetParticipantCount,
            facilityId: request.FacilityId,
            userId: request.UserId);

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(reservation.Id, ct);
    }

    public async Task<ReservationResponse> UpdateAsync(Guid id, UpdateReservationRequest request, CancellationToken ct = default)
    {
        var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == id, ct)
                          ?? throw new NotFoundException(nameof(Reservation), id);

        ValidateFields(request.StartTime, request.EndTime, request.Reason, request.TargetParticipantCount);

        // A cancelled reservation does not occupy the slot, so skip the overlap check for it.
        if (request.Status != ReservationStatus.Cancelled)
            await EnsureSlotIsFreeAsync(reservation.FacilityId, request.StartTime, request.EndTime, excludeReservationId: id, ct);

        reservation.Update(request.StartTime, request.EndTime, request.Reason.Trim(), request.TargetParticipantCount, request.Status);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == id, ct)
                          ?? throw new NotFoundException(nameof(Reservation), id);

        _db.Reservations.Remove(reservation);
        await _db.SaveChangesAsync(ct);
    }

    private static void ValidateFields(DateTimeOffset startTime, DateTimeOffset endTime, string reason, int targetParticipantCount)
    {
        if (endTime <= startTime)
            throw new BadRequestException("EndTime must be after StartTime.");
        if (string.IsNullOrWhiteSpace(reason))
            throw new BadRequestException("Reason is required.");
        if (targetParticipantCount < 1)
            throw new BadRequestException("TargetParticipantCount must be at least 1.");
    }

    internal static void EnsureUserIsEligible(Facility facility, User user)
    {
        var genderAllowed = facility.AllowedGender == AllowedGender.Any
                            || facility.AllowedGender.ToString() == user.Gender.ToString();
        if (!genderAllowed)
            throw new ConflictException($"Facility '{facility.Name}' is restricted to {facility.AllowedGender} users.");

        var roleAllowed = facility.AllowedRole == AllowedRole.Any
                          || facility.AllowedRole.ToString() == user.Role.ToString();
        if (!roleAllowed)
            throw new ConflictException($"Facility '{facility.Name}' is restricted to the {facility.AllowedRole} role.");
    }

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

    private static string GenerateReservationId()
        => $"RES-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
}

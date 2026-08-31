using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Data;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Exceptions;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Services;

public class EventParticipantService : IEventParticipantService
{
    private readonly AppDbContext _db;

    public EventParticipantService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<EventParticipantResponse>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.EventParticipants.AsNoTracking()
            .OrderBy(ep => ep.CreatedAt)
            .Select(EventParticipantMappingExtensions.Projection)
            .ToListAsync(ct);
    }

    public async Task<EventParticipantResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.EventParticipants.AsNoTracking()
            .Where(ep => ep.Id == id)
            .Select(EventParticipantMappingExtensions.Projection)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(EventParticipant), id);
    }

    public async Task<List<EventParticipantResponse>> GetByReservationIdAsync(string reservationId, CancellationToken ct = default)
    {
        if (!await _db.Reservations.AnyAsync(r => r.ReservationId == reservationId, ct))
            throw new NotFoundException(nameof(Reservation), reservationId);

        return await _db.EventParticipants.AsNoTracking()
            .Where(ep => ep.ReservationId == reservationId)
            .OrderBy(ep => ep.CreatedAt)
            .Select(EventParticipantMappingExtensions.Projection)
            .ToListAsync(ct);
    }

    public async Task<List<EventParticipantResponse>> GetByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (!await _db.Users.AnyAsync(u => u.KfupmId == userId, ct))
            throw new NotFoundException(nameof(User), userId);

        return await _db.EventParticipants.AsNoTracking()
            .Where(ep => ep.UserId == userId)
            .OrderBy(ep => ep.CreatedAt)
            .Select(EventParticipantMappingExtensions.Projection)
            .ToListAsync(ct);
    }

    public async Task<EventParticipantResponse> CreateAsync(CreateEventParticipantRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.KfupmId == request.UserId, ct)
                   ?? throw new NotFoundException(nameof(User), request.UserId);

        var reservation = await _db.Reservations.AsNoTracking()
                              .Include(r => r.Facility)
                              .FirstOrDefaultAsync(r => r.ReservationId == request.ReservationId, ct)
                          ?? throw new NotFoundException(nameof(Reservation), request.ReservationId);

        if (reservation.Status == ReservationStatus.Cancelled)
            throw new ConflictException("Cannot join a cancelled reservation.");

        if (await _db.EventParticipants.AnyAsync(ep => ep.UserId == request.UserId && ep.ReservationId == request.ReservationId, ct))
            throw new ConflictException("This user is already a participant of the reservation.");

        var currentCount = await _db.EventParticipants.CountAsync(ep => ep.ReservationId == request.ReservationId, ct);
        if (currentCount >= reservation.TargetParticipantCount)
            throw new ConflictException($"The reservation is full ({reservation.TargetParticipantCount} participants).");

        ReservationService.EnsureUserIsEligible(reservation.Facility, user);

        var participant = new EventParticipant(request.UserId, request.ReservationId);
        _db.EventParticipants.Add(participant);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(participant.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var participant = await _db.EventParticipants.FirstOrDefaultAsync(ep => ep.Id == id, ct)
                          ?? throw new NotFoundException(nameof(EventParticipant), id);

        _db.EventParticipants.Remove(participant);
        await _db.SaveChangesAsync(ct);
    }
}

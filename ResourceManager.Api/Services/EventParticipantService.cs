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

    public async Task<PagedResult<EventParticipantResponse>> GetAllAsync(EventParticipantQuery query, CancellationToken ct = default)
    {
        if (query.UserId is not null && !await _db.Users.AnyAsync(u => u.KfupmId == query.UserId, ct))
            throw new NotFoundException(nameof(User), query.UserId);

        if (query.ReservationId is not null && !await _db.Reservations.AnyAsync(r => r.ReservationId == query.ReservationId, ct))
            throw new NotFoundException(nameof(Reservation), query.ReservationId);

        var participants = _db.EventParticipants.AsNoTracking();

        if (query.UserId is not null)
            participants = participants.Where(ep => ep.UserId == query.UserId);

        if (query.ReservationId is not null)
            participants = participants.Where(ep => ep.ReservationId == query.ReservationId);

        return await participants
            .OrderBy(ep => ep.CreatedAt)
            .ThenBy(ep => ep.Id)
            .Select(EventParticipantMappingExtensions.Projection)
            .ToPagedResultAsync(query, ct);
    }

    public async Task<EventParticipantResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.EventParticipants.AsNoTracking()
            .Where(ep => ep.Id == id)
            .Select(EventParticipantMappingExtensions.Projection)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(EventParticipant), id);
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

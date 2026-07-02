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
        var participants = await _db.EventParticipants.AsNoTracking()
            .Include(ep => ep.User)
            .Include(ep => ep.Reservation)
            .OrderBy(ep => ep.CreatedAt)
            .ToListAsync(ct);
        return participants.Select(ep => ep.ToResponse()).ToList();
    }

    public async Task<EventParticipantResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var participant = await _db.EventParticipants.AsNoTracking()
            .Include(ep => ep.User)
            .Include(ep => ep.Reservation)
            .FirstOrDefaultAsync(ep => ep.Id == id, ct)
            ?? throw new NotFoundException(nameof(EventParticipant), id);
        return participant.ToResponse();
    }

    public async Task<List<EventParticipantResponse>> GetByReservationIdAsync(Guid reservationId, CancellationToken ct = default)
    {
        if (!await _db.Reservations.AnyAsync(r => r.Id == reservationId, ct))
            throw new NotFoundException(nameof(Reservation), reservationId);

        var participants = await _db.EventParticipants.AsNoTracking()
            .Include(ep => ep.User)
            .Include(ep => ep.Reservation)
            .Where(ep => ep.ReservationId == reservationId)
            .OrderBy(ep => ep.CreatedAt)
            .ToListAsync(ct);
        return participants.Select(ep => ep.ToResponse()).ToList();
    }

    public async Task<List<EventParticipantResponse>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == userId, ct))
            throw new NotFoundException(nameof(User), userId);

        var participants = await _db.EventParticipants.AsNoTracking()
            .Include(ep => ep.User)
            .Include(ep => ep.Reservation)
            .Where(ep => ep.UserId == userId)
            .OrderBy(ep => ep.CreatedAt)
            .ToListAsync(ct);
        return participants.Select(ep => ep.ToResponse()).ToList();
    }

    public async Task<EventParticipantResponse> CreateAsync(CreateEventParticipantRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.UserId, ct)
                   ?? throw new NotFoundException(nameof(User), request.UserId);

        var reservation = await _db.Reservations.AsNoTracking()
                              .Include(r => r.Facility)
                              .FirstOrDefaultAsync(r => r.Id == request.ReservationId, ct)
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

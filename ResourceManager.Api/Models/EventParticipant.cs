namespace ResourceManager.Api.Models;

public class EventParticipant : EntityBase
{
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;

    public Guid ReservationId { get; private set; }
    public Reservation Reservation { get; private set; } = null!;

    private EventParticipant() { }

    public EventParticipant(Guid userId, Guid reservationId)
    {
        UserId = userId;
        ReservationId = reservationId;
    }
}
namespace ResourceManager.Api.Models;

public class EventParticipant : EntityBase
{
    public string UserId { get; private set; } = string.Empty;
    public User User { get; private set; } = null!;

    public string ReservationId { get; private set; } = string.Empty;
    public Reservation Reservation { get; private set; } = null!;

    private EventParticipant() { }

    public EventParticipant(string userId, string reservationId)
    {
        UserId = userId;
        ReservationId = reservationId;
    }
}
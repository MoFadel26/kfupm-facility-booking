namespace ResourceManager.Api.Models;

public class EventParticipant : EntityBase
{
    public string KfupmId { get; private set; } = string.Empty;
    public User User { get; private set; } = null!;

    public string ReservationId { get; private set; } = string.Empty;
    public Reservation Reservation { get; private set; } = null!;

    private EventParticipant() { }

    public EventParticipant(string kfupmId, string reservationId)
    {
        KfupmId = kfupmId;
        ReservationId = reservationId;
    }
}
using ResourceManager.Api.Models;

namespace ResourceManager.Api.DTO;

public class CreateEventParticipantRequest
{
    public Guid UserId { get; set; }

    public Guid ReservationId { get; set; }
}

public class EventParticipantResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserKfupmId { get; set; } = string.Empty;
    public Guid ReservationId { get; set; }
    public string ReservationRef { get; set; } = string.Empty;
    public string ReservationReason { get; set; } = string.Empty;
}

public static class EventParticipantMappingExtensions
{
    /// <summary>Expects <c>User</c> and <c>Reservation</c> navigations to be loaded.</summary>
    public static EventParticipantResponse ToResponse(this EventParticipant participant) => new()
    {
        Id = participant.Id,
        UserId = participant.UserId,
        UserName = participant.User.Name,
        UserKfupmId = participant.User.KfupmId,
        ReservationId = participant.ReservationId,
        ReservationRef = participant.Reservation.ReservationId,
        ReservationReason = participant.Reservation.Reason
    };
}

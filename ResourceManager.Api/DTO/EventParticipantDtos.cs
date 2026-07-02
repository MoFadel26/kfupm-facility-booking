using System.ComponentModel.DataAnnotations;
using ResourceManager.Api.Models;

namespace ResourceManager.Api.DTO;

public class CreateEventParticipantRequest
{
    [Required, MaxLength(20)]
    public string UserId { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string ReservationId { get; set; } = string.Empty;
}

public class EventParticipantResponse
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string ReservationId { get; set; } = string.Empty;
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
        ReservationId = participant.ReservationId,
        ReservationReason = participant.Reservation.Reason
    };
}

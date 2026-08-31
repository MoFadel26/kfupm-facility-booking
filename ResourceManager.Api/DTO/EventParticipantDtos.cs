using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
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
    /// <summary>
    /// An expression, not a method body, so EF translates it into the SELECT list. A list
    /// query then reads exactly these columns instead of materialising whole entities and
    /// their navigations only to copy a few fields out of them.
    /// </summary>
    public static readonly Expression<Func<EventParticipant, EventParticipantResponse>> Projection = participant => new EventParticipantResponse
    {
        Id = participant.Id,
        UserId = participant.UserId,
        UserName = participant.User.Name,
        ReservationId = participant.ReservationId,
        ReservationReason = participant.Reservation.Reason
    };

    private static readonly Func<EventParticipant, EventParticipantResponse> Map = Projection.Compile();

    /// <summary>In-memory mapping for an entity already loaded. Expects <c>User</c> and <c>Reservation</c> to be loaded.</summary>
    public static EventParticipantResponse ToResponse(this EventParticipant eventParticipant) => Map(eventParticipant);
}

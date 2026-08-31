using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.DTO;

public class CreateReservationRequest
{
    public DateTimeOffset StartTime { get; set; }

    public DateTimeOffset EndTime { get; set; }

    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TargetParticipantCount { get; set; }

    [Required, MaxLength(20)]
    public string FacilityId { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string UserId { get; set; } = string.Empty;
}

public class UpdateReservationRequest
{
    public DateTimeOffset StartTime { get; set; }

    public DateTimeOffset EndTime { get; set; }

    [Required, MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TargetParticipantCount { get; set; }

    public ReservationStatus Status { get; set; }
}

public class ReservationResponse
{
    public Guid Id { get; set; }
    public string ReservationId { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ReservationStatus Status { get; set; }
    public int TargetParticipantCount { get; set; }
    public string FacilityId { get; set; } = string.Empty;
    public string FacilityName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}

public static class ReservationMappingExtensions
{
    /// <summary>
    /// An expression, not a method body, so EF translates it into the SELECT list. A list
    /// query then reads exactly these columns instead of materialising whole entities and
    /// their navigations only to copy a few fields out of them.
    /// </summary>
    public static readonly Expression<Func<Reservation, ReservationResponse>> Projection = reservation => new ReservationResponse
    {
        Id = reservation.Id,
        ReservationId = reservation.ReservationId,
        StartTime = reservation.StartTime,
        EndTime = reservation.EndTime,
        Reason = reservation.Reason,
        Status = reservation.Status,
        TargetParticipantCount = reservation.TargetParticipantCount,
        FacilityId = reservation.FacilityId,
        FacilityName = reservation.Facility.Name,
        UserId = reservation.UserId,
        UserName = reservation.User.Name
    };

    private static readonly Func<Reservation, ReservationResponse> Map = Projection.Compile();

    /// <summary>In-memory mapping for an entity already loaded. Expects <c>Facility</c> and <c>User</c> to be loaded.</summary>
    public static ReservationResponse ToResponse(this Reservation reservation) => Map(reservation);
}

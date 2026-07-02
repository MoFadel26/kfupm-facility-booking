using System.ComponentModel.DataAnnotations;
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

    public Guid FacilityId { get; set; }

    public Guid UserId { get; set; }
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
    public Guid FacilityId { get; set; }
    public string FacilityRef { get; set; } = string.Empty;
    public string FacilityName { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
}

public static class ReservationMappingExtensions
{
    /// <summary>Expects <c>Facility</c> and <c>User</c> navigations to be loaded.</summary>
    public static ReservationResponse ToResponse(this Reservation reservation) => new()
    {
        Id = reservation.Id,
        ReservationId = reservation.ReservationId,
        StartTime = reservation.StartTime,
        EndTime = reservation.EndTime,
        Reason = reservation.Reason,
        Status = reservation.Status,
        TargetParticipantCount = reservation.TargetParticipantCount,
        FacilityId = reservation.FacilityId,
        FacilityRef = reservation.Facility.FacilityId,
        FacilityName = reservation.Facility.Name,
        UserId = reservation.UserId,
        UserName = reservation.User.Name
    };
}

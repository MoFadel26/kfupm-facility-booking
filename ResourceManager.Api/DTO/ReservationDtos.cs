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
        FacilityName = reservation.Facility.Name,
        UserId = reservation.UserId,
        UserName = reservation.User.Name
    };
}

using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Models;

public class Reservation : EntityBase
{
    public string ReservationId { get; private set; } = string.Empty;
    public DateTimeOffset StartTime { get; private set;}
    public DateTimeOffset EndTime { get; private set;}
    public string Reason { get; private set; } = string.Empty;
    public ReservationStatus Status { get; private set;} = ReservationStatus.Pending;
    public int TargetParticipantCount { get; private set;}

    public string FacilityId { get; private set; } = string.Empty;
    public Facility Facility { get; private set; } = null!;

    public string UserId { get; private set; } = string.Empty;
    public User User { get; private set; } = null!;

    public ICollection<EventParticipant> EventParticipants { get; private set;} = new List<EventParticipant>();

    private Reservation()
    {
    }

    public Reservation(
        string reservationId,
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string reason,
        int targetParticipantCount,
        string facilityId,
        string userId,
        ReservationStatus status = ReservationStatus.Pending)
    {
        ReservationId = reservationId;
        StartTime = startTime;
        EndTime = endTime;
        Reason = reason;
        TargetParticipantCount = targetParticipantCount;
        FacilityId = facilityId;
        UserId = userId;
        Status = status;
    }

    public void Update(
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string reason,
        int targetParticipantCount,
        ReservationStatus status)
    {
        StartTime = startTime;
        EndTime = endTime;
        Reason = reason;
        TargetParticipantCount = targetParticipantCount;
        Status = status;
    }
}
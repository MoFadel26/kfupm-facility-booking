using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Models;

public class Facility : EntityBase
{
    public string FacilityId { get; private set;} = string.Empty;
    public string Name { get; private set;} = string.Empty;
    public FacilityType Type { get; private set;}
    public AllowedGender AllowedGender { get; private set; } = AllowedGender.Any;
    public AllowedRole AllowedRole { get; private set; } = AllowedRole.Any;

    public ICollection<Reservation> Reservations { get; private set;} = new List<Reservation>();

    private Facility() { }

    public Facility(
        string facilityId,
        string name,
        FacilityType type,
        AllowedGender allowedGender = AllowedGender.Any,
        AllowedRole allowedRole = AllowedRole.Any)
    {
        FacilityId = facilityId;
        Name = name;
        Type = type;
        AllowedGender = allowedGender;
        AllowedRole = allowedRole;
    }

    /// <summary>FacilityId is deliberately absent: it is the principal key reservations
    /// reference, and changing it would orphan them.</summary>
    public void Update(
        string name,
        FacilityType type,
        AllowedGender allowedGender,
        AllowedRole allowedRole)
    {
        Name = name;
        Type = type;
        AllowedGender = allowedGender;
        AllowedRole = allowedRole;
    }
}
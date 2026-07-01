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
}
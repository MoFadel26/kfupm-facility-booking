using System.ComponentModel.DataAnnotations;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.DTO;

public class FacilityRequest
{
    [Required, MaxLength(20)]
    public string FacilityId { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    public FacilityType Type { get; set; }

    public AllowedGender AllowedGender { get; set; } = AllowedGender.Any;

    public AllowedRole AllowedRole { get; set; } = AllowedRole.Any;
}

public class FacilityResponse
{
    public Guid Id { get; set; }
    public string FacilityId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public FacilityType Type { get; set; }
    public AllowedGender AllowedGender { get; set; }
    public AllowedRole AllowedRole { get; set; }
}

public static class FacilityMappingExtensions
{
    public static FacilityResponse ToResponse(this Facility facility) => new()
    {
        Id = facility.Id,
        FacilityId = facility.FacilityId,
        Name = facility.Name,
        Type = facility.Type,
        AllowedGender = facility.AllowedGender,
        AllowedRole = facility.AllowedRole
    };
}

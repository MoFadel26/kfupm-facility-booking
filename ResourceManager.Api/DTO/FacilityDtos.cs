using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
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
    /// <summary>
    /// An expression, not a method body, so EF translates it into the SELECT list. A list
    /// query then reads exactly these columns instead of materialising whole entities and
    /// their navigations only to copy a few fields out of them.
    /// </summary>
    public static readonly Expression<Func<Facility, FacilityResponse>> Projection = facility => new FacilityResponse
    {
        Id = facility.Id,
        FacilityId = facility.FacilityId,
        Name = facility.Name,
        Type = facility.Type,
        AllowedGender = facility.AllowedGender,
        AllowedRole = facility.AllowedRole
    };

    private static readonly Func<Facility, FacilityResponse> Map = Projection.Compile();

    /// <summary>In-memory mapping for an entity already loaded.</summary>
    public static FacilityResponse ToResponse(this Facility facility) => Map(facility);
}

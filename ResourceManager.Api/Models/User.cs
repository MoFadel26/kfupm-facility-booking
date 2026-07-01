using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Models;

public class User : EntityBase
{
    public string KfupmId { get; private set;} = string.Empty;
    public string Name { get; private set;} = string.Empty;
    public string Email { get; private set;} = string.Empty;
    public UserRole Role { get; private set;}
    public Gender Gender { get; private set;}

    public ICollection<Reservation> Reservations { get; private set;} = new List<Reservation>();
    public ICollection<EventParticipant> EventParticipants { get; private set;} = new List<EventParticipant>();

    private User() { }

    public User(string kfupmId, string name, string email, UserRole role, Gender gender)
    {
        KfupmId = kfupmId;
        Name = name;
        Email = email;
        Role = role;
        Gender = gender;
    }
}
package com.example.swe206_project;

public class ClubPresident extends User{
    private String major;
    private String classStanding;
    private String clubName;
    public ClubPresident(int userId, String username, String clubName) {
        super(userId, username);
        this.clubName = clubName;
        this.classStanding =null;
        this.major = null;
    }
    //getters
    public String getClassStanding() {
        return classStanding;
    }

    public String getMajor() {
        return major;
    }

    public String getClubName() {
        return clubName;
    }

    //setters
    public void setClassStanding(String classStanding) {
        this.classStanding = classStanding;
    }
    public void setMajor(String major) {
        this.major = major;
    }

    public void setClubName(String clubName) {
        this.clubName = clubName;
    }
}

package com.example.swe206_project;

public class Staff extends User{
    private String jobTitle;
    public Staff(int userId, String username, String jobTitle) {
        super(userId, username);
        this.jobTitle = jobTitle;
    }

    //getter
    public String getJobTitle() {
        return jobTitle;
    }

    //setter
    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }
}

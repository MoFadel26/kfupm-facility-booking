package com.example.swe206_project;

import java.util.Random;

public class Student extends User{
    private String major;
    private String classStanding;
    public Student(int userId, String username) {
        super(userId, username);
        this.classStanding = null;
        this.major = null;
    }

    // getters
    public String getMajor() {
        return major;
    }
    public String getClassStanding() {
        return classStanding;
    }

    //setters
    public void setClassStanding(String classStanding) {
        this.classStanding = classStanding;
    }

    public void setMajor(String major) {
        this.major = major;
    }
}

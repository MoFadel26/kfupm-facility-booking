package com.example.swe206_project;

public class Faculty extends User{
    private String department;
    public Faculty(int userId, String username, String department) {
        super(userId, username);
        this.department = department;
    }

    //getter
    public String getDepartment() {
        return department;
    }
    //setter
    public void setDepartment(String department) {
        this.department = department;
    }
}

package com.example.swe206_project;

import java.time.LocalDateTime;

public class TimeSlot {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean isReserved;

    public TimeSlot(LocalDateTime startTime, LocalDateTime endTime){
        this.startTime = startTime;
        this.endTime = endTime;
        this.isReserved = false;
    }

    //getters
    public LocalDateTime getEndTime() {
        return endTime;
    }
    public LocalDateTime getStartTime() {
        return startTime;
    }
    public boolean isReserved(){
        return isReserved;
    }

    //setters
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
    public void setReserved(boolean reserved) {
        isReserved = reserved;
    }
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    /*
    public boolean overlaps(TimeSlot otherTimeslot){

    }
     */
}

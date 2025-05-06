'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, CheckCircle, History, TimerReset } from 'lucide-react'; // Updated icons
import { format } from 'date-fns'; // For formatting dates
import { cn } from '@/lib/utils';

const DEFAULT_FOCUS_MINUTES = 25;
const MAX_HISTORY_ENTRIES = 20; // Limit the number of history entries shown/stored

interface SessionEntry {
  durationMinutes: number;
  completedAt: string; // Store as ISO string
}

export default function Home() {
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(DEFAULT_FOCUS_MINUTES);
  const [timeLeft, setTimeLeft] = useState(customDurationMinutes * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [nickname, setNickname] = useState<string>('');
  const [sessionHistory, setSessionHistory] = useState<SessionEntry[]>([]);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // To prevent hydration errors with localStorage

  const { toast } = useToast();

  const currentFocusDurationSeconds = useMemo(() => customDurationMinutes * 60, [customDurationMinutes]);

  // Load nickname and corresponding history from localStorage on mount
  useEffect(() => {
    setIsMounted(true); // Component has mounted
    const storedNickname = localStorage.getItem('focusFlowNickname');
    if (storedNickname) {
      setNickname(storedNickname);
      const storedHistory = localStorage.getItem(`focusFlowHistory_${storedNickname}`);
      if (storedHistory) {
        try {
          const parsedHistory: SessionEntry[] = JSON.parse(storedHistory);
          setSessionHistory(parsedHistory);
        } catch (error) {
          console.error("Failed to parse session history from localStorage:", error);
          setSessionHistory([]);
        }
      } else {
        setSessionHistory([]); // No history for this nickname
      }
    }
     // Load custom duration if exists
    const storedDuration = localStorage.getItem('focusFlowDuration');
    if (storedDuration) {
      const duration = parseInt(storedDuration, 10);
      if (!isNaN(duration) && duration > 0) {
        setCustomDurationMinutes(duration);
        // Set initial timeLeft based on stored duration if timer not active
        if (!timerActive) {
            setTimeLeft(duration * 60);
        }
      }
    }
  }, []); // Empty dependency array: Run only once on mount

  // Save history to localStorage whenever it changes for the current nickname
  useEffect(() => {
    if (isMounted && nickname) {
      localStorage.setItem(`focusFlowHistory_${nickname}`, JSON.stringify(sessionHistory));
    }
  }, [sessionHistory, nickname, isMounted]);

  // Save nickname and duration to localStorage
  useEffect(() => {
     if (isMounted) {
      localStorage.setItem('focusFlowNickname', nickname);
      localStorage.setItem('focusFlowDuration', customDurationMinutes.toString());
    }
  }, [nickname, customDurationMinutes, isMounted]);

   // Update timeLeft when customDurationMinutes changes and timer is not active
  useEffect(() => {
    if (!timerActive) {
      setTimeLeft(currentFocusDurationSeconds);
    }
  }, [customDurationMinutes, timerActive, currentFocusDurationSeconds]);


  // Timer logic
  useEffect(() => {
    if (!isMounted) return; // Don't run timer logic on server or before mount

    let interval: NodeJS.Timeout | null = null;

    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => Math.max(0, prevTime - 1)); // Ensure timeLeft doesn't go below 0
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      handleSessionComplete();
    } else {
       if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft, isMounted]); // Add isMounted dependency

  const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNickname = event.target.value;
    setNickname(newNickname);
    // Load history for the new nickname
    const storedHistory = localStorage.getItem(`focusFlowHistory_${newNickname}`);
    if (storedHistory) {
        try {
            const parsedHistory: SessionEntry[] = JSON.parse(storedHistory);
            setSessionHistory(parsedHistory);
        } catch (error) {
            console.error("Failed to parse session history from localStorage:", error);
            setSessionHistory([]);
        }
    } else {
        setSessionHistory([]); // Reset history if none exists for this nickname
    }
  };

   const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(event.target.value, 10);
    // Set a reasonable min/max, e.g., 1 to 120 minutes
    if (!isNaN(newDuration) && newDuration >= 1 && newDuration <= 120) {
      setCustomDurationMinutes(newDuration);
      // Update timeLeft immediately if timer isn't running
      if (!timerActive) {
          setTimeLeft(newDuration * 60);
      }
    } else if (event.target.value === '') {
        // Allow clearing the input, maybe default back or handle validation
        // For now, let's reset to default if cleared or invalid
         setCustomDurationMinutes(DEFAULT_FOCUS_MINUTES);
         if (!timerActive) {
           setTimeLeft(DEFAULT_FOCUS_MINUTES * 60);
         }
    }
  };

  const startTimer = () => {
    if (!nickname) {
       toast({
        title: "Nickname Required",
        description: "Please enter a nickname before starting.",
        variant: "destructive",
      });
      return;
    }
     if (customDurationMinutes < 1 || customDurationMinutes > 120) {
       toast({
        title: "Invalid Duration",
        description: "Please set a duration between 1 and 120 minutes.",
        variant: "destructive",
      });
      return;
    }
    // Only reset time if it's at the starting duration (or 0 after completion)
    if (timeLeft === currentFocusDurationSeconds || timeLeft === 0) {
       setTimeLeft(currentFocusDurationSeconds);
    }
    setShowCompletionMessage(false); // Hide completion message
    setTimerActive(true);
  };

  const pauseTimer = () => {
    setTimerActive(false);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimeLeft(currentFocusDurationSeconds);
    setShowCompletionMessage(false);
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSessionComplete = useCallback(() => {
    setShowCompletionMessage(true);
    toast({
      title: "Session Complete!",
      description: `✅ Great job! You completed a ${customDurationMinutes}-minute session.`,
      variant: "default",
      duration: 5000,
    });

    // Record session in history
    const newSessionEntry: SessionEntry = {
        durationMinutes: customDurationMinutes,
        completedAt: new Date().toISOString(),
    };

    setSessionHistory((prevHistory) => {
        // Add new entry and limit history size
        const updatedHistory = [newSessionEntry, ...prevHistory];
        return updatedHistory.slice(0, MAX_HISTORY_ENTRIES);
    });


    // Reset timer display after a short delay
    setTimeout(() => {
       setTimeLeft(currentFocusDurationSeconds); // Reset to the custom duration
       setShowCompletionMessage(false); // Optionally hide message after reset
    }, 1500);

  }, [nickname, customDurationMinutes, toast, currentFocusDurationSeconds]);


  const progress = useMemo(() => {
    if (currentFocusDurationSeconds === 0) return 0; // Avoid division by zero
    return ((currentFocusDurationSeconds - timeLeft) / currentFocusDurationSeconds) * 100;
  }, [timeLeft, currentFocusDurationSeconds]);


  // Render null or a loading state until mounted to avoid hydration mismatches
  if (!isMounted) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 md:p-8">
      <Card className="w-full max-w-md mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">FocusFlow Timer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="w-full flex justify-center items-center gap-4">
             <div className="flex-1 text-center">
                <Label htmlFor="duration" className="text-sm text-muted-foreground">Duration (min)</Label>
                <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="120"
                    value={customDurationMinutes}
                    onChange={handleDurationChange}
                    className="w-20 text-center text-lg font-medium mx-auto mt-1"
                    aria-label="Focus duration in minutes"
                    disabled={timerActive} // Disable changing duration while timer runs
                />
            </div>
            <div
              className={cn(
                "text-6xl font-mono font-bold transition-colors duration-300",
                timerActive ? "text-primary" : "text-foreground"
              )}
              aria-live="polite"
              aria-atomic="true"
              style={{ minWidth: '160px' }} // Ensure consistent width
            >
              {formatTime(timeLeft)}
            </div>
            <div className="flex-1"> {/* Spacer */} </div>
          </div>
          <Progress value={progress} className="w-full h-2 transition-all duration-1000 ease-linear" />
          {showCompletionMessage && (
            <div className="flex items-center gap-2 text-accent-foreground p-3 bg-accent rounded-md transition-opacity duration-500 animate-in fade-in">
              <CheckCircle className="h-5 w-5" />
              <span>Session Complete!</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
         <Input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={handleNicknameChange}
            className="w-full text-center mb-4"
            aria-label="Nickname"
          />
          <div className="flex justify-center gap-4 w-full">
            {!timerActive ? (
               <Button
                onClick={startTimer}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex-grow"
                disabled={!nickname || customDurationMinutes < 1 || customDurationMinutes > 120 || (timeLeft > 0 && timeLeft < currentFocusDurationSeconds)} // Disable if paused or invalid duration
                aria-label="Start Focus Session"
              >
                <Play className="mr-2 h-4 w-4" /> {timeLeft > 0 && timeLeft < currentFocusDurationSeconds ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline" className="flex-grow" aria-label="Pause Session">
                <Pause className="mr-2 h-4 w-4" /> Pause
              </Button>
            )}
             <Button onClick={resetTimer} variant="secondary" className="flex-grow" disabled={timerActive || timeLeft === currentFocusDurationSeconds} aria-label="Reset Timer">
                <TimerReset className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>

        </CardFooter>
      </Card>

       {/* Session History Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-semibold">Session History</CardTitle>
           <History className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {sessionHistory.length > 0 ? (
            <div className="max-h-60 overflow-y-auto"> {/* Scrollable history */}
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessionHistory.map((entry, index) => (
                    <TableRow key={index}>
                        <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(entry.completedAt), 'PPp')} {/* Format date nicely */}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                        {entry.durationMinutes} min
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          ) : (
             <p className="text-center text-muted-foreground italic py-4">
              {nickname ? `No sessions recorded for ${nickname} yet.` : 'Enter a nickname and complete a session to see history.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, CheckCircle, Award, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOCUS_DURATION = 25 * 60; // 25 minutes in seconds
const POINTS_PER_SESSION = 25;

interface LeaderboardEntry {
  nickname: string;
  points: number;
}

export default function Home() {
  const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
  const [timerActive, setTimerActive] = useState(false);
  const [nickname, setNickname] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  const { toast } = useToast();

  // Load nickname and leaderboard from localStorage on mount
  useEffect(() => {
    const storedNickname = localStorage.getItem('focusFlowNickname');
    if (storedNickname) {
      setNickname(storedNickname);
    }

    const storedLeaderboard = localStorage.getItem('focusFlowLeaderboard');
    if (storedLeaderboard) {
      try {
        const parsedLeaderboard: LeaderboardEntry[] = JSON.parse(storedLeaderboard);
         // Sort leaderboard on load
        setLeaderboard(parsedLeaderboard.sort((a, b) => b.points - a.points));
      } catch (error) {
        console.error("Failed to parse leaderboard from localStorage:", error);
        setLeaderboard([]); // Reset if parsing fails
      }
    }
  }, []);

  // Save leaderboard to localStorage whenever it changes
  useEffect(() => {
    // Ensure leaderboard is always sorted before saving
    const sortedLeaderboard = [...leaderboard].sort((a, b) => b.points - a.points);
    localStorage.setItem('focusFlowLeaderboard', JSON.stringify(sortedLeaderboard));
  }, [leaderboard]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timerActive && timeLeft === 0) {
      setTimerActive(false);
      handleSessionComplete();
    } else if (!timerActive && timeLeft !== FOCUS_DURATION) {
      // If timer paused, clear interval
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);


  const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newNickname = event.target.value;
    setNickname(newNickname);
    localStorage.setItem('focusFlowNickname', newNickname);
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
    setTimeLeft(FOCUS_DURATION); // Reset timer
    setShowCompletionMessage(false); // Hide completion message
    setTimerActive(true);
  };

  const pauseTimer = () => {
    setTimerActive(false);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimeLeft(FOCUS_DURATION);
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
      description: `✅ Great job! You earned ${POINTS_PER_SESSION} points.`,
      variant: "default", // Use accent color defined in theme
      duration: 5000,
    });

    // Update leaderboard
    setLeaderboard((prevLeaderboard) => {
      const existingEntryIndex = prevLeaderboard.findIndex(entry => entry.nickname === nickname);
      let newLeaderboard;

      if (existingEntryIndex !== -1) {
        // Update existing entry
        newLeaderboard = [...prevLeaderboard];
        newLeaderboard[existingEntryIndex] = {
          ...newLeaderboard[existingEntryIndex],
          points: newLeaderboard[existingEntryIndex].points + POINTS_PER_SESSION,
        };
      } else {
        // Add new entry
        newLeaderboard = [...prevLeaderboard, { nickname, points: POINTS_PER_SESSION }];
      }

      // Sort and return top entries (e.g., top 10)
      return newLeaderboard.sort((a, b) => b.points - a.points).slice(0, 10);
    });

    // Reset timer display after a short delay to show 00:00 briefly
    setTimeout(() => {
       setTimeLeft(FOCUS_DURATION);
    }, 1500); // Delay reset slightly

  }, [nickname, toast]);


  const progress = ((FOCUS_DURATION - timeLeft) / FOCUS_DURATION) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 md:p-8">
      <Card className="w-full max-w-md mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">FocusFlow Timer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div
            className={cn(
              "text-6xl font-mono font-bold transition-colors duration-300",
              timerActive ? "text-primary" : "text-foreground"
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {formatTime(timeLeft)}
          </div>
          <Progress value={progress} className="w-full h-2 transition-all duration-1000 ease-linear" />
          {showCompletionMessage && (
            <div className="flex items-center gap-2 text-accent-foreground p-3 bg-accent rounded-md transition-opacity duration-500 animate-in fade-in">
              <CheckCircle className="h-5 w-5" />
              <span>Great job! You earned {POINTS_PER_SESSION} points.</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex justify-center gap-4 w-full">
            {!timerActive ? (
              <Button
                onClick={startTimer}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex-grow"
                disabled={!nickname || (timeLeft !== FOCUS_DURATION && timeLeft > 0)} // Disable if paused or no nickname
              >
                <Play className="mr-2 h-4 w-4" /> Start Focus Session
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="outline" className="flex-grow">
                <Pause className="mr-2 h-4 w-4" /> Pause Session
              </Button>
            )}
             <Button onClick={resetTimer} variant="secondary" className="flex-grow" disabled={timerActive || timeLeft === FOCUS_DURATION}>
                Reset Timer
            </Button>
          </div>
          <Input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={handleNicknameChange}
            className="w-full text-center"
            aria-label="Nickname"
          />
        </CardFooter>
      </Card>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-semibold">Leaderboard</CardTitle>
           <Trophy className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Rank</TableHead>
                  <TableHead>Nickname</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={index} className={entry.nickname === nickname ? "bg-accent/50" : ""}>
                    <TableCell className="font-medium text-center">{index + 1}</TableCell>
                    <TableCell>{entry.nickname}</TableCell>
                    <TableCell className="text-right">{entry.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <p className="text-center text-muted-foreground italic py-4">
              Complete a focus session to appear on the leaderboard!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

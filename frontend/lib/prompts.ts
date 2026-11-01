export type GuidedPrompt = {
  id: string;
  title: string;
  category: string;
  description: string;
  prompt: string;
  suggestedMood: string;
  suggestedTags: string[];
};

export const guidedPrompts: GuidedPrompt[] = [
  {
    id: "stress-loop",
    title: "Stress loop",
    category: "Stress",
    description: "Notice what keeps re-triggering pressure and how it changes your self-talk.",
    prompt:
      "What has been stressing me lately is... The part that keeps replaying in my mind is... When this pressure shows up, I usually tell myself... What I think I need underneath all of it is...",
    suggestedMood: "anxious",
    suggestedTags: ["stress", "school", "reflection"],
  },
  {
    id: "goal-energy",
    title: "Goal energy",
    category: "Motivation",
    description: "Reflect on the difference between feeling driven and feeling pressured.",
    prompt:
      "A goal I keep returning to is... I feel most energized about it when... I feel drained by it when... One version of progress that would feel honest this week is...",
    suggestedMood: "motivated",
    suggestedTags: ["goals", "motivation", "future"],
  },
  {
    id: "relationship-check",
    title: "Relationship check-in",
    category: "Relationships",
    description: "Explore how someone else is affecting your emotional clarity right now.",
    prompt:
      "A relationship or interaction I keep thinking about is... What felt easy or difficult about it was... The part I have not said out loud yet is... What I might need more clearly in this dynamic is...",
    suggestedMood: "uncertain",
    suggestedTags: ["relationships", "reflection"],
  },
  {
    id: "future-uncertainty",
    title: "Future uncertainty",
    category: "Future",
    description: "Slow down the swirl around the future and identify what is actually most alive right now.",
    prompt:
      "Something uncertain about the future that has been on my mind is... The fear underneath it sounds like... The part that is actually in my control this week is... A smaller next step could be...",
    suggestedMood: "uncertain",
    suggestedTags: ["future", "stress", "goals"],
  },
  {
    id: "wins-and-support",
    title: "Wins and support",
    category: "Growth",
    description: "Capture what helped, not just what hurt, so patterns of support become visible too.",
    prompt:
      "A moment that helped me feel more like myself recently was... I think it helped because... I want to remember this because... One way I could make more room for this next week is...",
    suggestedMood: "hopeful",
    suggestedTags: ["reflection", "habits", "motivation"],
  },
  {
    id: "self-pressure",
    title: "Self-pressure reset",
    category: "Self-talk",
    description: "Untangle the difference between wanting to grow and being hard on yourself.",
    prompt:
      "Lately I have been putting pressure on myself around... The standard I keep holding is... What that pressure is trying to protect me from is... A kinder but still honest expectation would be...",
    suggestedMood: "overwhelmed",
    suggestedTags: ["stress", "habits", "reflection"],
  },
];

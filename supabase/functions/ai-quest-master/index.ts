// supabase/functions/ai-quest-master/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const getSideQuestPrompt = (studentSummary: string) => `
You are an AI Quest Master. Your job is to create a single, personalized side quest for a student based on their recent performance.

Student Performance Summary:
---
${studentSummary}
---

Your Task:
Based on the summary, generate a JSON object for a single side quest. The JSON must have the keys: "title", "description", "quest_type" ('lesson' or 'quiz'), and "xp_reward" (a number between 30 and 100).

- If the student is struggling, create a "Refresher" or "Practice" quest.
- If the student is excelling, create an "Expert Challenge" or "Deep Dive" quest.
- The title should be engaging and the description encouraging.
`;

Deno.serve(async (req) => {
  // In production, this would be triggered by a cron job, not a POST request.
  // And it would loop through multiple students. For now, we simulate for one.
  const { studentId } = await req.json();

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Fetch student's recent activity (this is a simplified example)
  const { data: recentQuests } = await supabaseAdmin
    .from('student_quests')
    .select('title, status')
    .eq('student_id', studentId)
    .limit(5);

  const summary = `Student recently completed quests: ${JSON.stringify(recentQuests)}`;

  // 2. Get the side quest from the AI
  // ... (Call Groq with getSideQuestPrompt)
  const aiResponse = { title: "AI Generated Quest", description: "...", quest_type: 'quiz', xp_reward: 50 }; // Placeholder
  
  // 3. Insert the new side quest into the database
  await supabaseAdmin.from('student_quests').insert({
      student_id: studentId,
      ...aiResponse
  });

  return new Response(JSON.stringify({ success: true, quest: aiResponse.title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
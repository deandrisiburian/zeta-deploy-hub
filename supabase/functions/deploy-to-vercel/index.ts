import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeploymentRequest {
  projectId: string;
  name: string;
  githubUrl?: string;
  githubBranch?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { projectId, name, githubUrl, githubBranch } = await req.json() as DeploymentRequest;
    console.log('Deploying project:', { projectId, name, githubUrl, githubBranch });

    // Create deployment record
    const { data: deployment, error: deploymentError } = await supabaseClient
      .from('deployments')
      .insert({
        project_id: projectId,
        status: 'pending',
      })
      .select()
      .single();

    if (deploymentError) {
      throw deploymentError;
    }

    console.log('Created deployment record:', deployment.id);

    // Deploy to Vercel
    const vercelToken = "zjznYB6XnvJDrIZUd2aVqL84";
    if (!vercelToken) {
      throw new Error('VERCEL_TOKEN not configured');
    }

    // Deploy to Vercel without gitSource for now
    // Note: Full git integration requires repoId which needs additional API calls
    const vercelPayload: any = {
      name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      // gitSource requires repoId from Vercel API, omitting for simpler deployment
    };

    console.log('Deploying to Vercel:', vercelPayload);

    const vercelResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vercelPayload),
    });

    const vercelData = await vercelResponse.json();
    console.log('Vercel response:', vercelData);

    if (!vercelResponse.ok) {
      throw new Error(`Vercel deployment failed: ${JSON.stringify(vercelData)}`);
    }

    const deploymentUrl = `https://${vercelData.url}`;

    // Update project and deployment
    await supabaseClient
      .from('projects')
      .update({
        deployment_url: deploymentUrl,
        status: 'deployed',
      })
      .eq('id', projectId);

    await supabaseClient
      .from('deployments')
      .update({
        status: 'success',
        deployed_at: new Date().toISOString(),
        build_logs: JSON.stringify(vercelData),
      })
      .eq('id', deployment.id);

    console.log('Updated deployment status to success');

    // Send Telegram notification
    try {
      await supabaseClient.functions.invoke('send-telegram-notification', {
        body: {
          projectName: name,
          deploymentUrl,
          status: 'success',
        },
      });
      console.log('Telegram notification sent');
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deploymentUrl,
        vercelDeployment: vercelData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Deployment error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

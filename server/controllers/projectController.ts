import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import openai, { getCompletion } from "../configs/openai.js";

// controller function to make revision
export const makeRevision = async (req: Request, res:Response) => {
    const userId = req.userId;
    try {

        const {projectId} = req.params as any;
        const {message} = req.body;

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if (!userId || !user) {
            return res.status(401).json({message: "Unauthorized"});
        }

        if(user.credits < 5){
            return res.status(403).json({message: 'add more credits to make changes'})
        }

        if(!message || message.trim() ===''){
            return res.status(403).json({message: 'Please enter a valid prompt'})
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where:{id: projectId, userId},
            include: {versions: true}
        })

        if (!currentProject) {
            return res.status(403).json({message: 'Project Not Found'})
        }

        await prisma.conversation.create({
            data: {
                role:'user',
                content: message,
                projectId
            }
        })

        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 5}}
        })

        // enhance user prompt
        const promptEnhanceResponse = await getCompletion({
            max_tokens: 2048,
            messages: [
                {
                    role: 'system',
                    content:`
                    You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).
                    `
                },
                {
                    role:'user',
                    content:`User's request: "${message}`
                }
            ]
        })

        const enhancePrompt = promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data:{
                role:'assistant',
                content: `I've enhanced your prompt to: "${enhancePrompt}`,
                projectId
            }
        })
        
        await prisma.conversation.create({
            data:{
                role:'assistant',
                content: 'Now making changes to your website...',
                projectId
            }
        })

        // generate website code
        const codeGenerationResponse = await getCompletion({
            max_tokens: 8192,
            messages:[
                {
                    role: 'system',
                    content: `
                    You are an expert web developer specializing in visual excellence and premium UI/UX design. Modify the existing website code to apply the requested changes while maintaining the highest visual, structural, and copywriting standards.

                    MASTER UI/UX STRUCTURE BLUEPRINT (MANDATORY PAGE FLOW):
                    You must structure the generated single-page website with the following sections, styled with premium Tailwind utility classes:
                    1. NAVIGATION BAR: Sticky, transparent glassmorphism header (e.g., "sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-white/10") containing a beautiful text logo, desktop navigation links with active hover states, and a fully functional mobile hamburger menu operated via simple JavaScript.
                    2. HERO SECTION: A jaw-dropping presentation featuring:
                       - An eyebrow badge capsule (e.g. "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-6") to draw attention.
                       - A massive, bold heading with gradient text (e.g., "text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 leading-none").
                       - A descriptive subtitle with balanced leading.
                       - Primary and outlined secondary call-to-action (CTA) buttons with scaling transitions on hover.
                       - A beautiful mock visual mockup (representing a dashboard screen, card, or interface) featuring rounded corners, subtle shadows, and a thin border.
                    3. FEATURES GRID: A responsive 3-column container showcasing the product or service features:
                       - Use modern card components (e.g., "bg-white/5 border border-white/10 p-6 rounded-2xl transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/5 hover:-translate-y-1").
                       - Include highly styled icon bubbles (Font Awesome icons placed inside styled backgrounds).
                       - Provide detailed headlines and informative copy for every feature.
                    4. TESTIMONIALS: A section showing trust and social proof:
                       - Grid of cards containing customer reviews.
                       - Include Unsplash/Pravatar profile pictures (e.g. <img class="w-10 h-10 rounded-full object-cover" src="https://i.pravatar.cc/100?img=12" alt="...">), customer name, job title, and glowing star rating icons (<i class="fas fa-star text-amber-400"></i>).
                    5. PRICING OR SERVICES: An interactive section showing 3 tiers/options:
                       - Highlight the "Popular" tier using a glowing indigo border or colored top badge.
                       - Detail clear, actual dollar pricing and write a robust checklist of features with styled checkmark icons.
                    6. CONTACT FORM: A glassmorphism block containing structured input fields with glowing focus rings, proper labels, and an interactive submit button.
                    7. FOOTER: Multiple columns for links, logo, social icon row (GitHub, Twitter, LinkedIn), and copyright text.

                    VISUAL AND DESIGN STANDARDS (CRITICAL FOR UX):
                    - Maintain a sophisticated, modern dark theme palette (Slate-950/Slate-900 background) paired with vibrant gradient accent highlights (indigo, teal, purple, rose).
                    - Load modern, premium Google Fonts in the <head> (e.g., family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800) and apply to the body.
                    - Include the Font Awesome CDN for icons in the <head>: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    - Apply responsive design flawlessly at all width breakpoints (sm:, md:, lg:, xl:).
                    - Add interactive JavaScript components (hamburger menu toggling, pricing switcher) inside script tags at the bottom.
                    - Utilise micro-animations, transitions, and hover-state scale/translation effects to make the interface feel premium and alive.

                    CONTENT AND COPYWRITING STANDARDS (CRITICAL):
                    - Write actual, tailored marketing copy for every header, description, checklist item, pricing option, and testimonial text.
                    - NEVER use "Lorem Ipsum", "lorem ipsum dolor...", "text here", or other placeholders.

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - Do NOT include markdown formatting or code fences (e.g. do NOT wrap the code in \`\`\`html).
                    - Use Tailwind CSS for ALL styling.
                    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                    - Use Tailwind utility classes for all styling changes.
                    - Include all JavaScript in <script> tags before closing </body>
                    - Make sure it's a complete, standalone HTML document with Tailwind CSS
                    - Return the HTML Code Only, nothing else
                    `
                },
                {
                    role:'user',
                    content:`Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancePrompt}`
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';

        if(!code){
            await prisma.conversation.create({
                data: {
                    role:'assistant',
                    content:"Unable to generate the code, please try again",
                    projectId
                }
            })
            await prisma.user.update({
                where: {id: userId},
                data: {credits: {increment: 5}}
            })
            return res.status(500).json({ message: "Unable to generate the code, please try again" });
        }

        const version = await prisma.version.create({
            data:{
                code: code.replace(/```[a-z]*\n?/gi,'').replace(/```$/g,'').trim(),
                description: 'changes made',
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role:'assistant',
                content:"I've made the changes to your website! You can now preview it",
                projectId
            }
        })

        await prisma.websiteProject.update({
            where: {id: projectId},
            data:{
                current_code: code.replace(/```[a-z]*\n?/gi,'').replace(/```$/g,'').trim(),
                current_version_index: version.id
            }
        })

        res.json({message:'Changes made successfully'})
    } catch (error: any) {
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}


// controller function to rollback to a specific version
export const rollbackToVersion = async (req: Request, res:Response) => {

    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const {projectId, versionId} = req.params as any;
        const project = await prisma.websiteProject.findUnique({
            where:{id: projectId, userId},
            include: {versions: true}
        })

        if (!project) {
            return res.status(404).json({ message: 'Project Not Found' });
        }

        const version = project.versions.find((version)=>version.id === versionId);

        if(!version){
            return res.status(404).json({ message: 'Version Not Found' });
        }

        await prisma.websiteProject.update({
            where:{id: projectId, userId},
            data:{
                current_code: version.code,
                current_version_index: version.id
            }
        })

        await prisma.conversation.create({
            data: {
                role:'assistant',
                content:"I've rolled back your website to selected version. You can now preview it",
                projectId
            }
        })

        res.json({message:'Version rolled back'});

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}


// controller function to delete a project
export const deleteProject = async (req: Request, res:Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params as any;

        await prisma.websiteProject.delete({
            where:{id: projectId, userId}
        })

        res.json({message:'Project deleted succesfully'});

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}


// controller for getting project code for preview
export const getProjectPreview = async (req: Request, res:Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params as any;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const project =await prisma.websiteProject.findFirst({
            where:{id: projectId, userId},
            include: {versions: true}
        })

        if (!project) {
            return res.status(404).json({ message: 'Project Not found' });
        }

        res.json({ project });

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}


// get published projects
export const getPublishedProjects = async (req: Request, res:Response) => {
    try {

        const projects =await prisma.websiteProject.findMany({
            where:{isPublished: true},
            include: {user: true}
        })

        res.json({ projects });

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}


// get a sigle project by id
export const getProjectById = async (req: Request, res:Response) => {
    try {
        const { projectId } = req.params as any;
        const project =await prisma.websiteProject.findFirst({
            where:{id: projectId},
        })

        if (!project || project?.isPublished === false || !project?.current_code) {
            return res.status(404).json({ message: 'Project Not found' });
        }

        res.json({ code: project. current_code });

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}


// controller to save project code
export const saveProjectCode = async (req: Request, res:Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params as any;
        const {code} = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!code) {
            return res.status(400).json({ message: 'Code is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where:{id: projectId, userId}
        })
        
        if(!project){
            return res.status(404).json({ message: 'Project Not Found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId},
            data:{current_code: code, current_version_index: ''}
        })

        res.json({ message: 'Project saved successfully' });

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({message: error.message});
    }
}
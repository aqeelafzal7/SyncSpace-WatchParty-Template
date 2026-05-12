# **App Name**: The Friends Space

## Core Features:

- User Display Name Input: An input field for the user to enter their desired display name.
- Video URL Input & Validation: An input field for users to paste a video URL. This will validate if it's a valid YouTube URL or an .mp4 file, and strictly reject URLs from known adult domains.
- Optional Room Customization: Input fields for an optional room name and an optional password to lock the room.
- Create Room Button: A prominent button to initiate the room creation process.
- Unique Room ID Generation: Generates a unique identifier for each watch party room upon creation.
- Firestore Room Data Storage: Saves room settings, including video URL, host name, password (if any), and an empty guest list, to a Firestore 'rooms' collection.
- Room Page Redirection: After room creation, redirects the user to the specific room page using the generated unique ID.

## Style Guidelines:

- Dark Mode Color Scheme. Primary color: deep indigo (#5E40B3) reflecting a sense of modern sophistication. Background color: muted dark violet-grey (#25232A), providing a sleek, cinematic base. Accent color: vibrant blue (#7091F8), used for interactive elements and highlights to pop against the dark theme.
- Body and headline font: 'Inter' (sans-serif), for a modern, objective, and neutral aesthetic that complements the sleek design.
- Utilize minimalist and clean icons to maintain the sleek and uncluttered design, ensuring they are easily recognizable even in dark mode.
- A centralized, minimal layout focusing on essential input fields and the prominent 'Create Room' action, designed for a spacious and unfussy user experience.
- Subtle, smooth transition animations for button hovers, form submissions, and page redirects to enhance the cinematic feel without distracting the user.
// Video data for the application
export const videos = [
  {
    id: "video1",
    title: "Big Buck Bunny",
    description:
      "A short animated film featuring a large rabbit dealing with three bullying rodents",
    thumbnail:
      "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.jpg",
    duration: "9:56",
    source:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  },
  {
    id: "video2",
    title: "Elephant Dream",
    description: "The first open movie project from the Blender Foundation",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    duration: "10:53",
    source:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  },
  {
    id: "video3",
    title: "Tears of Steel",
    description: "Sci-fi film about a group of warriors and scientists",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
    duration: "12:14",
    source:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  },
  {
    id: "video4",
    title: "For Bigger Escapes",
    description:
      "Introducing Chromecast. The easiest way to enjoy online video and music on your TV.",
    thumbnail:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    duration: "0:15",
    source:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
];

// Helper function to find a video by ID
export const getVideoById = (videoId) => {
  return videos.find((video) => video.id === videoId) || null;
};

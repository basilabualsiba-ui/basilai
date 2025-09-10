// YouTube API utility functions
export const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const getVideoInfo = async (videoId: string) => {
  try {
    // Using oEmbed API (no API key required)
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!response.ok) throw new Error('Video not found');
    
    const data = await response.json();
    return {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url,
      duration: null // oEmbed doesn't provide duration
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return null;
  }
};

export const createEmbedUrl = (videoId: string, autoplay = false, mute = false) => {
  const params = new URLSearchParams({
    enablejsapi: '1',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    fs: '1',
    iv_load_policy: '3'
  });
  
  if (autoplay) params.append('autoplay', '1');
  if (mute) params.append('mute', '1');
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};
export const environment = {
  production: false,
  quicksight: {
    defaultUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    defaultTitle: 'YouTube Video',
    defaultWidth: '100%',
    defaultHeight: '400px',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
    allowedDomains: [
      'quicksight.aws.amazon.com', 
      'quicksight.amazonaws.com',
      'youtube.com', 
      'youtu.be', 
      'maps.google.com', 
      'google.com',
      'vimeo.com', 
      'player.vimeo.com', 
      'dailymotion.com',
      'slideshare.net', 
      'prezi.com', 
      'scribd.com'
    ]
  }
};

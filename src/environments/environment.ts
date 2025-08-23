export const environment = {
  production: false,
  quicksight: {
    defaultUrl: 'https://us-east-1.quicksight.aws.amazon.com/sn/embed?account=YOUR_ACCOUNT&dashboard=YOUR_DASHBOARD_ID&authcode=YOUR_AUTHCODE',
    defaultTitle: 'QuickSight Dashboard',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
    allowedDomains: [
      'quicksight.aws.amazon.com', 
      'quicksight.amazonaws.com'
    ]
  }
};

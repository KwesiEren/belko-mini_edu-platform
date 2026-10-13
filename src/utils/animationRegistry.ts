export interface AnimationMeta {
  key: string;
  fileName: string;
  title: string;
  creator: string;
  url: string;
  license: string;
  defaultLoop: boolean;
}

export const animationRegistry: Record<string, AnimationMeta> = {
  'empty-students': {
    key: 'empty-students',
    fileName: 'boxes-unloading.json',
    title: 'Boxes Unloading',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/boxes-unloading-rakijDVT6l',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'empty-attendance': {
    key: 'empty-attendance',
    fileName: 'package-box-tracking.json',
    title: 'Package Box Tracking',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/package-box-tracking-ecommerce-MIlz2VjeMu',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'empty-fees': {
    key: 'empty-fees',
    fileName: 'conveyor-belt-unloading.json',
    title: 'Conveyor Belt Box Unloading',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/conveyor-belt-box-unloading-BO89CkBOnn',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'save-success': {
    key: 'save-success',
    fileName: 'successful-animation.json',
    title: 'Successful Animation',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/successful-animation-c8QekzbLtu',
    license: 'Lottie Simple License',
    defaultLoop: false,
  },
  'backup-complete': {
    key: 'backup-complete',
    fileName: 'cloud-data-backup.json',
    title: 'Cloud Data Backup Store',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/cloud-data-backup-store-3f4KENC8bj',
    license: 'Lottie Simple License',
    defaultLoop: false,
  },
  'import-progress': {
    key: 'import-progress',
    fileName: 'boxes-unloading.json',
    title: 'Boxes Unloading',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/boxes-unloading-rakijDVT6l',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'export-progress': {
    key: 'export-progress',
    fileName: 'package-box-tracking.json',
    title: 'Package Box Tracking',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/package-box-tracking-ecommerce-MIlz2VjeMu',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'report-progress': {
    key: 'report-progress',
    fileName: 'digital-networking.json',
    title: 'Digital Networking',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/digital-networking-SqHZC58buq',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'warning': {
    key: 'warning',
    fileName: 'questions.json',
    title: 'Questions',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animations/questions',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'lock-screen': {
    key: 'lock-screen',
    fileName: 'secure-document.json',
    title: 'Secure Document',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/secure-document-CvBDipAK54',
    license: 'Lottie Simple License',
    defaultLoop: false,
  },
  'setup-complete': {
    key: 'setup-complete',
    fileName: 'email-sent.json',
    title: 'Email Successfully Sent',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/email-successfully-sent-4G3lpWY4zA',
    license: 'Lottie Simple License',
    defaultLoop: false,
  },
  'network-waiting': {
    key: 'network-waiting',
    fileName: 'radio-tower-signal.json',
    title: 'Radio Tower Signal',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/radio-tower-signal-qwQH2qfV5Z',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
  'network-connected': {
    key: 'network-connected',
    fileName: 'wireless-charger.json',
    title: 'Wireless Charger',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/wireless-charger-MI6Cjqz1DW',
    license: 'Lottie Simple License',
    defaultLoop: false,
  },
  'login-calm': {
    key: 'login-calm',
    fileName: 'security-pock.json',
    title: 'Security Pock Protected Secured',
    creator: 'MD Abdur Rahim',
    url: 'https://lottiefiles.com/free-animation/security-pock-protected-secured-CBHFkHRX5F',
    license: 'Lottie Simple License',
    defaultLoop: true,
  },
};

export const animationKeys = Object.keys(animationRegistry) as (keyof typeof animationRegistry)[];

export function getAnimationMeta(key: string): AnimationMeta | undefined {
  return animationRegistry[key];
}

export function getAllCredits(): string {
  let credits = '# Animation Credits\n\n';
  credits += 'All animations by MD Abdur Rahim, licensed under Lottie Simple License.\n\n';
  credits += '| Key | Title | Creator | URL | License |\n';
  credits += '|-----|-------|---------|-----|---------|\n';
  for (const meta of Object.values(animationRegistry)) {
    credits += `| ${meta.key} | ${meta.title} | ${meta.creator} | ${meta.url} | ${meta.license} |\n`;
  }
  return credits;
}
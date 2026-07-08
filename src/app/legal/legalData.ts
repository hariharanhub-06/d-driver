// Structured content for the public legal policy pages, transcribed from the ONLIVE
// policy documents (effective 2026-07-07). Rendered by PolicyView.tsx.
//
// To update a policy: edit the blocks below and bump EFFECTIVE_DATE if the change is
// material (the same version string is recorded against each user's consent on the
// first-login screen — see backend authController CURRENT_TERMS_VERSION).

export const EFFECTIVE_DATE = 'July 7, 2026';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] };

export interface Section {
  heading?: string;
  blocks: Block[];
}

export interface Policy {
  slug: string;
  title: string;
  intro: string;
  sections: Section[];
}

const privacy: Policy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy describes how ONLIVE School Transport & Parent Platform (“ONLIVE”, “we”, “us”, or “our”) collects, uses, processes, and shares your personal information when you use our Service. We are committed to protecting your privacy and handling your data in a transparent and secure manner.',
  sections: [
    {
      heading: '1. Information We Collect',
      blocks: [
        {
          type: 'p',
          text: 'We collect various types of information to provide and improve our Service. The categories of data collected depend on your role (School, Parent, Driver, Bus Attendant, School Administrator, Super Admin) and how you interact with the Service.',
        },
        {
          type: 'p',
          text: '1.1 Personal Information You Provide to Us:',
        },
        {
          type: 'list',
          items: [
            'Student Information: Name, age, grade, school ID, photograph (optional), emergency contact details, and any special transportation needs. This information is typically provided by the School.',
            'Parent Information: Name, email address, phone number, residential address, and relationship to the student.',
            'Driver and Bus Attendant Information: Name, contact details, driver’s license information, employment details, and photographs (optional).',
            'School Administrator Information: Name, contact details, role, and school affiliation.',
            'Account Information: Usernames, passwords, and security questions.',
            'Communication Data: Information you provide when you communicate with us, such as support inquiries or feedback.',
          ],
        },
        { type: 'p', text: '1.2 Information Collected Automatically:' },
        {
          type: 'list',
          items: [
            'GPS Location Data: Real-time and historical GPS location data of school buses and associated devices, crucial for real-time tracking, route optimization, and safety features. Collected from devices used by Drivers and Bus Attendants.',
            'Device Information: Device model, operating system, unique device identifiers, IP address, mobile network information, and browser type.',
            'Usage Data: How you use the Service, such as features accessed, time spent, and interaction patterns.',
            'Log Data: Server logs may include your IP address, browser type, referring/exit pages, and timestamps.',
          ],
        },
      ],
    },
    {
      heading: '2. How We Use Your Information',
      blocks: [
        {
          type: 'p',
          text: 'We use the collected information primarily to provide, maintain, and improve the ONLIVE Service, and to ensure the safety and efficiency of school transport.',
        },
        {
          type: 'list',
          items: [
            'Service Provision: real-time bus tracking, route management, student check-in/check-out, and notifications.',
            'Safety and Security: enhancing student safety during transit, monitoring bus movements, and responding to emergencies.',
            'Communication: sending important notifications to Parents, Schools, and Drivers/Attendants.',
            'Service Improvement: analyzing usage patterns, troubleshooting, and developing new features.',
            'Personalization: customizing your experience on the Service.',
            'Compliance and Legal Obligations: complying with applicable laws, regulations, and legal processes.',
          ],
        },
      ],
    },
    {
      heading: '3. Data Security',
      blocks: [
        {
          type: 'p',
          text: 'We implement robust technical and organizational measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction:',
        },
        {
          type: 'list',
          items: [
            'Encryption: Data is encrypted both in transit (using SSL/TLS) and at rest.',
            'Access Controls: Strict access controls limit access to personal data to authorized personnel only.',
            'Regular Audits: We conduct regular security audits and vulnerability assessments.',
            'Employee Training: Our employees receive regular training on data privacy and security best practices.',
          ],
        },
      ],
    },
    {
      heading: '4. Data Retention',
      blocks: [
        {
          type: 'p',
          text: 'We retain personal information only for as long as necessary to fulfill the purposes for which it was collected, including satisfying legal, accounting, or reporting requirements.',
        },
        {
          type: 'list',
          items: [
            'GPS Location Data: typically retained for a limited period for operational and historical analysis, then anonymized or deleted.',
            'Student and Parent Information: retained for the duration of the student’s enrollment with a school using ONLIVE, and for a limited period thereafter as required by law or school policy.',
            'Account Information: retained as long as your account is active.',
          ],
        },
        {
          type: 'p',
          text: 'Upon expiration of the retention period, your personal data will be securely deleted or anonymized.',
        },
      ],
    },
    {
      heading: '5. Data Sharing and Disclosure',
      blocks: [
        {
          type: 'p',
          text: 'We do not sell your personal information to third parties. We may share your information: with Schools (to facilitate transport management and communication); with Service Providers (e.g. cloud hosting, analytics, payment processing, contractually obligated to protect your data); as required by Legal Requirements; in Business Transfers (merger, acquisition, or asset sale); and With Your Consent.',
        },
      ],
    },
    {
      heading: '6. Your Rights',
      blocks: [
        {
          type: 'p',
          text: 'Depending on your jurisdiction, you may have the following rights regarding your personal data:',
        },
        {
          type: 'list',
          items: [
            'Right to Access',
            'Right to Rectification',
            'Right to Erasure (Right to be Forgotten)',
            'Right to Restriction of Processing',
            'Right to Data Portability',
            'Right to Object',
            'Right to Withdraw Consent',
          ],
        },
        {
          type: 'p',
          text: 'To exercise any of these rights, please contact us using the contact information provided below.',
        },
      ],
    },
    {
      heading: '7. Changes to This Privacy Policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy or through other communication channels. Your continued use of the Service after such modifications constitutes your acknowledgment of the modified Privacy Policy.',
        },
      ],
    },
    {
      heading: '8. Contact Us',
      blocks: [
        {
          type: 'p',
          text: 'If you have any questions or concerns about this Privacy Policy or our data practices, please contact us.',
        },
      ],
    },
  ],
};

const terms: Policy = {
  slug: 'terms',
  title: 'Master Terms & Conditions',
  intro:
    'These Master Terms & Conditions (the “Terms”) govern your access to and use of the ONLIVE School Transport & Parent Platform (the “Service”). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      blocks: [
        {
          type: 'p',
          text: 'By creating an account, accessing, or using the ONLIVE Service, you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and Data Policy. These documents collectively form a legally binding agreement between you and ONLIVE.',
        },
      ],
    },
    {
      heading: '2. Definitions',
      blocks: [
        {
          type: 'list',
          items: [
            'Service: The ONLIVE School Transport & Parent Platform, including its mobile applications, website, and related services.',
            'User: Any individual or entity using the Service, including Schools, Parents, Drivers, Bus Attendants, School Administrators, and Super Admins.',
            'School: An educational institution that subscribes to and utilizes the Service.',
            'Parent: A legal guardian or parent of a student, accessing the platform to track their child’s transport.',
            'Driver / Bus Attendant: An individual employed or contracted to operate or assist on a school bus, using the respective ONLIVE application.',
            'School Administrator: Authorized School personnel who manage the Service for their institution.',
            'Super Admin: Authorized ONLIVE personnel responsible for overall management of the platform.',
          ],
        },
      ],
    },
    {
      heading: '3. Eligibility and User Accounts',
      blocks: [
        {
          type: 'p',
          text: '3.1 Eligibility: Users must be of legal age and have the legal capacity to enter into these Terms.',
        },
        {
          type: 'p',
          text: '3.2 Account Registration: You agree to provide accurate, current, and complete information; maintain and promptly update it; keep your password secure and confidential; and notify ONLIVE immediately of any unauthorized use of your account.',
        },
        {
          type: 'p',
          text: '3.3 Account Types and Roles: The Service supports School, Parent, Driver, Bus Attendant, and Super Admin accounts, each with specific functionalities and access levels.',
        },
      ],
    },
    {
      heading: '4. Service Scope and Modifications',
      blocks: [
        {
          type: 'p',
          text: 'ONLIVE provides a SaaS platform for school transport management and parent communication, including GPS tracking, route optimization, student attendance, and real-time notifications. ONLIVE reserves the right to modify, suspend, or discontinue the Service or any part thereof, with or without notice.',
        },
      ],
    },
    {
      heading: '5. User Responsibilities and Conduct',
      blocks: [
        {
          type: 'p',
          text: '5.1 Acceptable Use: You shall not use the Service for any illegal or unauthorized purpose; interfere with or disrupt its integrity or performance; attempt unauthorized access; upload malicious code; or overburden ONLIVE servers or networks.',
        },
        {
          type: 'p',
          text: '5.2 Data Accuracy: Users are responsible for the accuracy and completeness of the data they provide.',
        },
        {
          type: 'p',
          text: '5.3 Compliance with Laws: All Users, especially Schools, are responsible for ensuring their use complies with all relevant laws, including data privacy laws (e.g. GDPR, CCPA, DPDP Act) and transportation regulations.',
        },
      ],
    },
    {
      heading: '6. Intellectual Property Rights',
      blocks: [
        {
          type: 'p',
          text: 'All intellectual property rights in the Service are owned by ONLIVE or its licensors. You are granted a limited, non-exclusive, non-transferable license to use the Service for its intended purpose, subject to these Terms.',
        },
      ],
    },
    {
      heading: '7. Data Privacy and Security',
      blocks: [
        {
          type: 'p',
          text: 'Your use of the Service is also governed by our Privacy Policy and Data Policy, which are incorporated into these Terms by reference.',
        },
      ],
    },
    {
      heading: '8. Disclaimers and Limitation of Liability',
      blocks: [
        {
          type: 'p',
          text: 'The Service is provided on an “as is” and “as available” basis, without warranties of any kind. To the fullest extent permitted by law, ONLIVE shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, use, goodwill, or other intangible losses resulting from your use of or inability to use the Service.',
        },
      ],
    },
    {
      heading: '9. Indemnification',
      blocks: [
        {
          type: 'p',
          text: 'You agree to indemnify and hold harmless ONLIVE, its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising out of your use of the Service or your violation of these Terms.',
        },
      ],
    },
    {
      heading: '10. Governing Law and Dispute Resolution',
      blocks: [
        {
          type: 'p',
          text: 'These Terms shall be governed by and construed in accordance with the applicable governing law. Any disputes arising out of or relating to these Terms or the Service shall be resolved through the designated arbitration or courts.',
        },
      ],
    },
    {
      heading: '11. General Provisions',
      blocks: [
        {
          type: 'p',
          text: 'Entire Agreement: These Terms, together with the Privacy Policy and Data Policy, constitute the entire agreement between you and ONLIVE. Severability: If any provision is found unenforceable, it will be limited or eliminated to the minimum extent necessary. Waiver: ONLIVE’s failure to assert any right does not constitute a waiver.',
        },
      ],
    },
    {
      heading: '12. Contact Information',
      blocks: [{ type: 'p', text: 'If you have any questions about these Terms, please contact us.' }],
    },
  ],
};

const dataPolicy: Policy = {
  slug: 'data-policy',
  title: 'Data Policy',
  intro:
    'This Data Policy outlines the principles and practices governing the management, processing, security, and compliance of data within the ONLIVE School Transport & Parent Platform. This policy complements our Privacy Policy and Terms & Conditions.',
  sections: [
    {
      heading: '1. Data Ownership',
      blocks: [
        {
          type: 'p',
          text: '1.1 Customer Data: All data uploaded, submitted, or generated by Schools, Parents, Drivers, and Bus Attendants remains the property of the respective School or individual user. ONLIVE acts as a data processor on their behalf.',
        },
        {
          type: 'p',
          text: '1.2 ONLIVE Data: Data generated by ONLIVE for operating, maintaining, and improving the Service (e.g. aggregated and anonymized usage statistics, system logs, metadata) is owned by ONLIVE and does not contain personally identifiable information.',
        },
      ],
    },
    {
      heading: '2. Data Processing',
      blocks: [
        {
          type: 'list',
          items: [
            'Purpose of Processing: ONLIVE processes Customer Data solely to provide the Service, as instructed by Schools or individual users.',
            'Lawful Basis: Processing is conducted on a lawful basis — user consent, contractual necessity, legal obligation, or legitimate interests.',
            'Data Minimization: We collect and process only the data necessary for the intended purpose.',
            'Data Accuracy: We rely on users to provide accurate, up-to-date data and to correct any inaccuracies.',
          ],
        },
      ],
    },
    {
      heading: '3. Data Security',
      blocks: [
        {
          type: 'p',
          text: 'ONLIVE employs comprehensive security measures to protect Customer Data from unauthorized access, disclosure, alteration, and destruction:',
        },
        {
          type: 'list',
          items: [
            'Technical Safeguards: Encryption (in transit and at rest), firewalls, intrusion detection systems, and secure coding practices.',
            'Administrative Safeguards: Access controls, employee background checks, regular security training, and incident response plans.',
            'Physical Safeguards: Secure data centers with restricted access, surveillance, and environmental controls.',
          ],
        },
      ],
    },
    {
      heading: '4. Data Backup and Recovery',
      blocks: [
        {
          type: 'p',
          text: 'ONLIVE performs regular backups of Customer Data to prevent loss, maintains a disaster recovery plan for continuity and rapid restoration, and designs backup and recovery processes to maintain data integrity and availability.',
        },
      ],
    },
    {
      heading: '5. Data Retention and Deletion',
      blocks: [
        {
          type: 'p',
          text: '5.1 Retention Periods: Customer Data is retained only as long as necessary to fulfill its purposes, provide the Service, and comply with legal obligations. Specific periods are detailed in our Privacy Policy.',
        },
        {
          type: 'p',
          text: '5.2 Secure Deletion: Upon expiration of the retention period or upon a valid request, Customer Data will be securely deleted or anonymized in a manner that prevents its reconstruction.',
        },
      ],
    },
    {
      heading: '6. Confidentiality',
      blocks: [
        {
          type: 'p',
          text: 'All ONLIVE employees and contractors are bound by strict confidentiality agreements and trained on data protection principles. Any third-party service providers are contractually obligated to maintain the confidentiality and security of Customer Data.',
        },
      ],
    },
    {
      heading: '7. Compliance',
      blocks: [
        {
          type: 'p',
          text: 'ONLIVE is committed to complying with applicable data protection laws, including the General Data Protection Regulation (GDPR) for the EU, the California Consumer Privacy Act (CCPA) for California, the Digital Personal Data Protection Act (DPDP Act), 2023 for India, and other relevant local and international laws.',
        },
      ],
    },
    {
      heading: '8. Data Breach Notification',
      blocks: [
        {
          type: 'p',
          text: 'In the event of a data breach affecting Customer Data, ONLIVE will notify affected Schools and relevant regulatory authorities in accordance with applicable laws and our incident response plan.',
        },
      ],
    },
    {
      heading: '9. Changes to This Data Policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this Data Policy from time to time. Your continued use of the Service after such modifications constitutes your acknowledgment of the modified Data Policy.',
        },
      ],
    },
    {
      heading: '10. Contact Us',
      blocks: [{ type: 'p', text: 'If you have any questions about this Data Policy or our data practices, please contact us.' }],
    },
  ],
};

const cookiePolicy: Policy = {
  slug: 'cookie-policy',
  title: 'Cookie Policy',
  intro:
    'This Cookie Policy explains how ONLIVE uses cookies and similar technologies when you use our mobile applications and website. It should be read in conjunction with our Privacy Policy and Terms & Conditions.',
  sections: [
    {
      heading: '1. What Are Cookies and Similar Technologies?',
      blocks: [
        {
          type: 'p',
          text: 'Cookies are small text files placed on your device when you visit a website, used to make websites work more efficiently and to provide information to site owners. In mobile applications, similar technologies are often used:',
        },
        {
          type: 'list',
          items: [
            'Device Identifiers: Unique identifiers assigned to your mobile device (e.g. Advertising ID, IDFA) used for analytics and advertising.',
            'Local Storage: Data stored locally on your device by web browsers or applications.',
            'SDKs: Third-party code embedded in our Application that may collect data for analytics, advertising, or other functionalities.',
          ],
        },
      ],
    },
    {
      heading: '2. How We Use Cookies and Similar Technologies',
      blocks: [
        {
          type: 'list',
          items: [
            'Strictly Necessary/Essential: Enable core functionalities like security, network management, and accessibility. Without these, the Service cannot be provided.',
            'Performance/Analytics: Help us understand how users interact with the Service (e.g. via Google Analytics for Firebase) to improve performance and design.',
            'Functionality: Remember choices you make (like language preferences) and provide enhanced, more personal features.',
            'Advertising/Targeting (if applicable): Deliver more relevant advertisements, limit repetition, and measure campaign effectiveness.',
          ],
        },
      ],
    },
    {
      heading: '3. Third-Party Cookies and Technologies',
      blocks: [
        {
          type: 'p',
          text: 'We may allow third-party service providers to place cookies and similar technologies on our Website or within our Application to perform services on our behalf, such as analytics and advertising. These third parties may collect information about your online activities across different websites and applications over time.',
        },
      ],
    },
    {
      heading: '4. Your Choices and Consent',
      blocks: [
        {
          type: 'p',
          text: '4.1 Consent: Where required by applicable law (e.g. GDPR, CCPA), we obtain your explicit consent before placing non-essential cookies, presenting a clear consent mechanism when you first access our Website or Application.',
        },
        {
          type: 'p',
          text: '4.2 Managing Your Preferences: You can control cookies through your browser settings; control device identifiers through your mobile device settings (e.g. “Reset Advertising ID” on Android or “Limit Ad Tracking” on iOS); and use opt-out links where available.',
        },
        {
          type: 'p',
          text: '4.3 Consequences of Opting Out: If you disable or refuse cookies, some parts of the Service may become inaccessible or not function properly.',
        },
      ],
    },
    {
      heading: '5. Data Protection Regulations',
      blocks: [
        {
          type: 'p',
          text: 'We comply with relevant data protection regulations concerning cookies, including GDPR (EU — explicit consent for most cookies), CCPA (California — rights regarding the sale of personal information), and the DPDP Act, 2023 (India — consent for processing personal data).',
        },
      ],
    },
    {
      heading: '6. Changes to This Cookie Policy',
      blocks: [
        {
          type: 'p',
          text: 'We may update this Cookie Policy from time to time. Your continued use of the Service after such modifications constitutes your acknowledgment of the modified Cookie Policy.',
        },
      ],
    },
    {
      heading: '7. Contact Us',
      blocks: [{ type: 'p', text: 'If you have any questions about this Cookie Policy, please contact us.' }],
    },
  ],
};

export const POLICIES: Record<string, Policy> = {
  terms: terms,
  privacy: privacy,
  'data-policy': dataPolicy,
  'cookie-policy': cookiePolicy,
};

export const POLICY_LINKS = [
  { slug: 'terms', label: 'Terms & Conditions' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'data-policy', label: 'Data Policy' },
  { slug: 'cookie-policy', label: 'Cookie Policy' },
];

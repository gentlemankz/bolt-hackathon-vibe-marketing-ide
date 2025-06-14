import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Luframe - AI-powered marketing intelligence platform. Learn how we collect, use, and protect your data and marketing information.',
  openGraph: {
    title: 'Privacy Policy | Luframe',
    description: 'Privacy Policy for Luframe - AI-powered marketing intelligence platform. Learn how we collect, use, and protect your data and marketing information.',
    url: 'https://luframe.online/privacy',
  },
  twitter: {
    title: 'Privacy Policy | Luframe',
    description: 'Privacy Policy for Luframe - AI-powered marketing intelligence platform. Learn how we collect, use, and protect your data and marketing information.',
  },
  alternates: {
    canonical: 'https://luframe.online/privacy',
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#161316] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="text-gray-400 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              Luframe (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our marketing 
              intelligence platform and related services (the &ldquo;Service&rdquo;).
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              This policy applies to all users of our platform, including those who integrate marketing channels, 
              utilize our AI analysis tools, and access our data insights and recommendations.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">2.1 Account Information</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Name and email address</li>
              <li>Company information and business details</li>
              <li>Account credentials and authentication data</li>
              <li>Billing and payment information</li>
              <li>Communication preferences</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.2 Marketing Data</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Through platform integrations, we collect and process:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Campaign performance metrics and analytics</li>
              <li>Ad creative content (images, videos, text)</li>
              <li>Audience data and targeting information</li>
              <li>Advertising spend and budget data</li>
              <li>Conversion tracking and attribution data</li>
              <li>Platform-specific metrics from connected advertising accounts</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.3 Meta (Facebook) Ads Data</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              When you connect your Meta Ads account, we access and store the following data using Meta&apos;s Marketing API with specific permissions:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li><strong>ads_management scope:</strong> We read and manage your ad accounts, including account information, settings, and permissions</li>
              <li><strong>ads_read scope:</strong> We read your advertising data including campaigns, ad sets, ads, and their performance metrics</li>
              <li><strong>Ad Account Data:</strong> Account names, IDs, currency, timezone, and account status</li>
              <li><strong>Campaign Data:</strong> Campaign names, objectives, status, budget information, and performance metrics</li>
              <li><strong>Ad Set Data:</strong> Ad set names, targeting criteria, budget, schedule, and performance data</li>
              <li><strong>Ad Data:</strong> Ad names, creative content, status, and detailed performance metrics</li>
              <li><strong>Performance Metrics:</strong> Impressions, clicks, conversions, cost data, and other advertising metrics</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mb-6">
              We use this data solely to provide analytics, insights, and optimization recommendations for your advertising campaigns. 
              We do not modify, create, or delete your ads or campaigns without your explicit action through our platform.
            </p>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.4 Usage Information</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We automatically collect information about how you use our Service:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Platform usage patterns and feature interactions</li>
              <li>Session duration and frequency of use</li>
              <li>Device information and browser details</li>
              <li>IP address and geographic location</li>
              <li>Referral sources and navigation paths</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">2.5 AI Analysis Data</h3>
            <p className="text-gray-300 leading-relaxed">
              Our AI systems process and analyze your marketing data to generate insights, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Pattern recognition results from creative content analysis</li>
              <li>Performance predictions and optimization recommendations</li>
              <li>Audience behavior insights and segmentation data</li>
              <li>Competitive analysis and market trend identification</li>
            </ul>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">3.1 Service Provision</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Provide access to our marketing intelligence platform</li>
              <li>Process and analyze your marketing data using AI algorithms</li>
              <li>Generate insights, recommendations, and performance reports</li>
              <li>Enable campaign management and optimization features</li>
              <li>Facilitate integrations with third-party marketing platforms</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">3.2 Platform Improvement</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Enhance our AI models and analysis capabilities</li>
              <li>Develop new features and improve existing functionality</li>
              <li>Conduct research and development on marketing trends</li>
              <li>Optimize platform performance and user experience</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">3.3 Communication and Support</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Provide customer support and technical assistance</li>
              <li>Send service updates and important notifications</li>
              <li>Deliver educational content and best practices</li>
              <li>Process billing and handle subscription management</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">3.4 Legal and Security</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Comply with legal obligations and regulatory requirements</li>
              <li>Protect against fraud, abuse, and security threats</li>
              <li>Enforce our Terms of Service and other policies</li>
              <li>Respond to legal requests and court orders</li>
            </ul>
          </section>

          {/* Third-Party Integrations */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Platform Integrations</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">4.1 Marketing Platform Connections</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our Service integrates with various marketing and advertising platforms. When you connect these platforms:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>We access data through official APIs with your explicit authorization</li>
              <li>Data collection is limited to what&apos;s necessary for our Service functionality</li>
              <li>We comply with each platform&apos;s data usage policies and restrictions</li>
              <li>You can revoke access permissions at any time through your account settings</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">4.2 Supported Platforms</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We currently support integrations with major advertising platforms including but not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Meta (Facebook and Instagram) Ads</li>
              <li>Google Ads and Google Analytics</li>
              <li>TikTok for Business</li>
              <li>LinkedIn Ads</li>
              <li>Twitter Ads</li>
              <li>Snapchat Ads</li>
              <li>Other platforms as we expand our integrations</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">4.3 Meta Ads Integration Details</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our Meta Ads integration operates under strict data usage guidelines:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>We only access data necessary for providing analytics and insights</li>
              <li>All data access is performed through official Meta Marketing API endpoints</li>
              <li>We comply with Meta&apos;s Platform Terms and Developer Policies</li>
              <li>Data is used exclusively for the purpose of providing our marketing intelligence services</li>
              <li>We do not share Meta advertising data with unauthorized third parties</li>
              <li>Users maintain full control over their Meta account connections and can disconnect at any time</li>
            </ul>
          </section>

          {/* AI Processing and Analysis */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. AI Processing and Analysis</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">5.1 AI-Powered Insights</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our AI systems analyze your marketing data to provide:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Performance pattern recognition and trend analysis</li>
              <li>Creative content optimization recommendations</li>
              <li>Audience behavior insights and segmentation</li>
              <li>Predictive analytics for campaign performance</li>
              <li>Automated anomaly detection and alerts</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">5.2 Deep Content Analysis</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our advanced AI models perform deep analysis of visual content:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Image and video content analysis for performance indicators</li>
              <li>Visual element identification and effectiveness scoring</li>
              <li>Color, composition, and design pattern analysis</li>
              <li>Text overlay and messaging effectiveness evaluation</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">5.3 Data Anonymization</h3>
            <p className="text-gray-300 leading-relaxed">
              When using your data to improve our AI models, we employ strict anonymization techniques to ensure 
              individual privacy while enabling platform enhancement.
            </p>
          </section>

          {/* Data Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">6.1 We Do Not Sell Your Data</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We do not sell, rent, or trade your personal information or marketing data to third parties for 
              their commercial purposes.
            </p>

            <h3 className="text-xl font-medium mb-3 text-gray-200">6.2 Limited Sharing Scenarios</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may share your information only in these specific circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>With your explicit consent for specific purposes</li>
              <li>With service providers who assist in platform operations (under strict confidentiality agreements)</li>
              <li>When required by law, legal process, or government request</li>
              <li>To protect our rights, property, or safety, or that of our users</li>
              <li>In connection with a business transfer or acquisition (with notice to affected users)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">6.3 Aggregated and Anonymized Data</h3>
            <p className="text-gray-300 leading-relaxed">
              We may share aggregated, anonymized insights and industry trends that cannot be traced back to 
              individual users or specific campaigns.
            </p>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Security and Protection</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">7.1 Security Measures</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement comprehensive security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>End-to-end encryption for data transmission and storage</li>
              <li>Multi-factor authentication and access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Secure cloud infrastructure with industry-standard protections</li>
              <li>Employee training on data protection and privacy practices</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">7.2 Data Breach Response</h3>
            <p className="text-gray-300 leading-relaxed">
              In the unlikely event of a data breach, we will promptly notify affected users and relevant authorities 
              as required by law, and take immediate steps to contain and remediate the incident.
            </p>
          </section>

          {/* Your Rights and Choices */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights and Choices</h2>
            
            <h3 className="text-xl font-medium mb-3 text-gray-200">8.1 Access and Control</h3>
            <p className="text-gray-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Access and review your personal information and marketing data</li>
              <li>Update or correct inaccurate information</li>
              <li>Request deletion of your data (subject to legal and contractual obligations)</li>
              <li>Export your data in a portable format</li>
              <li>Restrict or object to certain data processing activities</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">8.2 Platform Integration Controls</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li>Disconnect third-party platform integrations at any time</li>
              <li>Control which data types are shared from connected platforms</li>
              <li>Manage AI analysis preferences and opt-out options</li>
              <li>Configure data retention and deletion schedules</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 text-gray-200">8.3 Communication Preferences</h3>
            <p className="text-gray-300 leading-relaxed">
              You can manage your communication preferences, including opting out of marketing emails while 
              continuing to receive essential service notifications.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We retain your information for as long as necessary to provide our services and fulfill the purposes 
              outlined in this Privacy Policy:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Account information: Retained while your account is active and for a reasonable period after closure</li>
              <li>Marketing data: Retained as long as you maintain platform integrations, plus backup retention periods</li>
              <li>Usage data: Typically retained for 2-3 years for analytics and improvement purposes</li>
              <li>AI analysis results: Retained to provide ongoing insights and historical comparisons</li>
              <li>Legal compliance: Some data may be retained longer to meet legal or regulatory requirements</li>
            </ul>
          </section>

          {/* International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Our services are operated from the United States. If you are located outside the US, your information 
              may be transferred to, stored, and processed in the United States. We ensure appropriate safeguards 
              are in place for international data transfers in compliance with applicable privacy laws.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal 
              information from children under 18. If we become aware that we have collected such information, we will 
              take steps to delete it promptly.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable 
              laws. We will notify you of material changes via email or through our platform. Your continued use of 
              the Service after such modifications constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-[#1e1e1e] border border-white/10 rounded-lg p-6">
              <p className="text-white font-semibold mb-2">Luframe</p>
              <p className="text-gray-300 mb-1">Email: support@luframe.online</p>
              <p className="text-gray-300 mb-1">Website: https://luframe.online</p>
              <p className="text-gray-300 text-sm mt-3">
                For privacy-specific inquiries, please include &ldquo;Privacy Policy&rdquo; in your email subject line.
              </p>
            </div>
          </section>

        </div>
      </main>

    </div>
  );
} 
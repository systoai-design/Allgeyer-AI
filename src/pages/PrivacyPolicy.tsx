export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-6 text-foreground">
          <p>
            This Privacy Policy describes how this application (the “App”) collects, uses, and shares information when you
            use the App.
          </p>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Information we collect</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Account information (e.g., email, name) used to authenticate you.</li>
              <li>Operational data you submit in the App (e.g., configuration, reports, and activity logs).</li>
              <li>Technical data (e.g., browser type, device identifiers, and diagnostics) to improve reliability.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">How we use information</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>To provide and maintain the App, including authentication and security.</li>
              <li>To operate automations and generate reports requested by you.</li>
              <li>To troubleshoot issues and improve performance and user experience.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Sharing</h2>
            <p className="text-muted-foreground">
              We may share information with service providers that help us run the App (e.g., hosting, email delivery, and
              analytics) and when required by law.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Your choices</h2>
            <p className="text-muted-foreground">
              You can request access, correction, or deletion of your information, subject to legal and contractual
              requirements.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-muted-foreground">
              For privacy questions, contact your organization’s administrator or support.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This page is a starter template for compliance workflows and may need review by your legal team.
          </p>
        </section>
      </div>
    </main>
  );
}

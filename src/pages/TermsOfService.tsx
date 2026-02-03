export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-6 text-foreground">
          <p>
            These Terms of Service (“Terms”) govern your access to and use of this application (the “App”). By using the App,
            you agree to these Terms.
          </p>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Use of the App</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>You must use the App in compliance with applicable laws and your organization’s policies.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You may not attempt to disrupt, abuse, or gain unauthorized access to the App.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Data & Integrations</h2>
            <p className="text-muted-foreground">
              The App may connect to third-party services (e.g., accounting platforms). Your use of those services is
              governed by their terms. You are responsible for ensuring you have the rights to connect and process data.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Disclaimers</h2>
            <p className="text-muted-foreground">
              The App is provided “as is” without warranties of any kind, to the maximum extent permitted by law.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Limitation of liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, the App operators will not be liable for indirect, incidental,
              consequential, or special damages.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Contact</h2>
            <p className="text-muted-foreground">For questions about these Terms, contact your organization’s administrator.</p>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: This page is a starter template for compliance workflows and may need review by your legal team.
          </p>
        </section>
      </div>
    </main>
  );
}

# Security Policy

## Reporting a vulnerability

Please report suspected security vulnerabilities privately using GitHub’s “Report a vulnerability” option on this repository’s Security page, or contact **[SECURITY CONTACT EMAIL]**. Do not publicly disclose an unpatched vulnerability or include sensitive user data in a report.

Include a description, affected version or commit, potential impact, and safe reproduction details. Do not access, modify, or delete other users’ data while investigating.

## Deployment expectations

Before operating a public production service:

- use HTTPS and keep the hosting platform and dependencies updated;
- keep secrets, production credentials, and user databases out of source control;
- require authentication and authorize every user-specific request on the server;
- back up production data and test restoration;
- review security alerts and scan results; and
- disable development tools and interactive API documentation if they are not needed.

# Vibe Coding Prompt Log

This document records the prompts used during the Vibe Coding
implementation of the Task Manager, including their purpose,
expected outcome, actual outcome, identified problems, and
subsequent prompt iterations.

---

## VIBE-001

### Date and time
29.9

### Prompt
I am developing a Task Manager web application.

I want you to help me build the application.

Use the following technology stack:

- Node.js and Express.js
- MongoDB with Mongoose
- Handlebars for server-side rendering
- HTML, CSS and JavaScript

The application will have two user roles: Admin (Sender) and Receiver.

For now, create the initial project structure and a working Express application with a clean, modern interface. Include the necessary configuration, dependencies and MongoDB connection.

The application should be easy to extend with authentication, task management and separate dashboards for the two roles.

### Purpose
To get a solid project draft to start build from

### Expected result
A working webapp with a nice design and the beginning of user roles

### Actual result
- What did the AI produce?
Download Task Manager Starter (.zip)

### Problems / observations
- What worked? What did not work? Were there bugs, hallucinations, missing functionality, or unexpected design decisions?

The AI generated a modular Node.js and Express application using MongoDB/Mongoose and Handlebars

Interesting observation: AI chose its own name of the app: TaskFlow

It also instructed me on how to run it.

### Manual intervention
- Did I manually modify anything? If so, what and why?

No

### Follow-up
- Was another prompt required? 

No

### Result
The AI-generated application successfully started using npm run dev.





## VIBE-002

### Date and time
29.9

### Prompt
Now implement user authentication and role-based access control in the existing Task Manager application.

The application has two roles: Admin (Sender) and Receiver.

Requirements:

- Users can register, log in and log out.
- Registration is open to everyone.
- Newly registered users should automatically receive the Receiver role.
- Administrators can create additional user accounts.
- Users should be redirected to their respective dashboards after login.
- Receivers must not be able to access administrative functionality.
- Passwords must be securely hashed.
- Authentication should use secure session management.

Create the necessary MongoDB/Mongoose models, Express routes, middleware and Handlebars views.

Integrate the functionality into the existing application and maintain the current visual design.

Make reasonable implementation decisions where needed.

### Purpose
Get working users and roles

### Expected result
A complete setup in the app where it's possible to sign up, login/logout. Secure storing of passwords, authentication, correct routing of users once logged in.

### Actual result
- What did the AI produce?

The AI generated an updated version of the application with authentication and role-based access control.

According to the AI's implementation summary, the following functionality was added:

Public registration with automatic assignment of the Receiver role.

Login and logout functionality.

Password hashing using bcrypt.

Persistent MongoDB-backed sessions.

Separate dashboards for Admin and Receiver.

Automatic dashboard redirection after login.

Admin-only user creation.

Server-side authorization middleware.

Additional security mechanisms, including CSRF protection, login rate limiting and session regeneration.

A separate command (npm run create-admin) for creating the first administrator.

The AI delivered the updated application as a ZIP archive

### Problems / observations
- What worked? What did not work? Were there bugs, hallucinations, missing functionality, or unexpected design decisions?

The AI introduced several security mechanisms without being explicitly instructed on how to implement them.

The AI reported that JavaScript syntax checks and ZIP integrity checks passed. However, it explicitly stated that a complete database-backed runtime test had not been performed.

After integrating the generated application, I performed manual functional testing of registration, login, logout, dashboard redirection, role-based access control and administrator account creation.

The tested functionality worked as expected, and no additional corrective prompts were required.

I also inspected the user records in MongoDB Compass and confirmed that passwords were stored as salted password hashes rather than plaintext.

An interesting observation was that the AI independently implemented additional security mechanisms beyond the explicitly stated requirements.

### Manual intervention
- Did I manually modify anything? If so, what and why?

Manually downloaded and extracted the generated ZIP archive, integrated the updated application into the existing project directory, and configured the required environment variables.

Installed the required dependencies and prepared the application for local testing.

No manual modifications to the generated application logic were made at this stage.

### Follow-up
- Was another prompt required? 

No additional prompts

### Result
The implementation successfully fulfilled the requested authentication and role-based access control functionality during manual testing.

Registration, login, logout, role-based dashboard redirection and administrator account creation worked as expected. Unauthorized access to administrative functionality was also tested.

Password storage was inspected using MongoDB Compass, confirming that passwords were stored as salted hashes rather than plaintext.

No additional prompts or manual modifications to the generated application logic were required.

Rate limiting and CSRF is not tested here.
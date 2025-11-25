# Setting Up GitHub Secrets for Deployment

This guide explains how to configure GitHub Secrets for automatic deployment with environment variables.

## Required Secrets

The following secrets need to be configured in your GitHub repository:

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

## How to Add Secrets

1. **Go to your GitHub repository**
   - Navigate to your repository on GitHub

2. **Open Settings**
   - Click on the "Settings" tab in your repository

3. **Navigate to Secrets**
   - In the left sidebar, click on "Secrets and variables"
   - Then click on "Actions"

4. **Add New Secret**
   - Click "New repository secret"
   - Enter the secret name (e.g., `REACT_APP_FIREBASE_API_KEY`)
   - Enter the secret value
   - Click "Add secret"

5. **Repeat for all secrets**
   - Add each of the required secrets listed above

## Getting Firebase Configuration Values

1. **Go to Firebase Console**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Select your project

2. **Get Configuration**
   - Click on the gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"
   - Scroll down to "Your apps" section
   - If you don't have a web app, click "Add app" and select the web icon (</>)
   - Copy the configuration values

3. **Map to Secrets**
   - `apiKey` → `REACT_APP_FIREBASE_API_KEY`
   - `authDomain` → `REACT_APP_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `REACT_APP_FIREBASE_PROJECT_ID`
   - `storageBucket` → `REACT_APP_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `REACT_APP_FIREBASE_APP_ID`
   - `measurementId` → `REACT_APP_FIREBASE_MEASUREMENT_ID`

## Example Secret Values

```
REACT_APP_FIREBASE_API_KEY=AIzaSyASFx_hSsJ2Rq9qdJuaND7fsRy-Vlsc34c
REACT_APP_FIREBASE_AUTH_DOMAIN=team-balancer-f196a.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=team-balancer-f196a
REACT_APP_FIREBASE_STORAGE_BUCKET=team-balancer-f196a.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=203717528050
REACT_APP_FIREBASE_APP_ID=1:203717528050:web:b44ab600e2255cdea3836b
REACT_APP_FIREBASE_MEASUREMENT_ID=G-FL3HFEJYNE
```

## Verification

After adding the secrets:

1. **Push to main branch** or manually trigger the workflow
2. **Check Actions tab** to see if the build succeeds
3. **Verify deployment** by checking your GitHub Pages site

## Local Development

For local development, create a `.env` file in the root directory:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id_here
```

**Note:** The `.env` file is already in `.gitignore` and will not be committed to the repository.

## Troubleshooting

### Build fails with "undefined" values
- Ensure all secrets are added correctly
- Check that secret names match exactly (case-sensitive)
- Verify the values are correct (no extra spaces)

### Deployment works but app doesn't connect to Firebase
- Check browser console for errors
- Verify Firebase configuration values are correct
- Ensure Firebase Authentication and Firestore are enabled

### Secrets not available during build
- Make sure secrets are added to the correct repository
- Verify the workflow file references the secrets correctly
- Check that the secrets are not organization-level secrets (if using repository-level)


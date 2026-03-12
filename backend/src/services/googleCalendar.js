/**
 * Google Calendar Service
 * Handles OAuth, event synchronization, and calendar operations with Google Calendar
 */

class GoogleCalendarService {
    constructor(credentials) {
        this.credentials = credentials;
        this.oauth2Client = null;
        this.calendar = null;
        this._initializeClient();
    }

    _initializeClient() {
        // Dynamic import to handle case where googleapis is not installed
        try {
            const { google } = require('googleapis');
            
            this.oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );
            
            if (this.credentials) {
                this.oauth2Client.setCredentials({
                    access_token: this.credentials.access_token,
                    refresh_token: this.credentials.refresh_token,
                    expiry_date: this.credentials.expires_at ? new Date(this.credentials.expires_at).getTime() : null
                });
            }
            
            this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
        } catch (error) {
            console.error('[GoogleCalendar] Failed to initialize:', error.message);
        }
    }

    /**
     * Generate OAuth URL for authorization
     */
    static getAuthUrl() {
        try {
            const { google } = require('googleapis');
            
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );
            
            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/userinfo.email'
            ];
            
            return oauth2Client.generateAuthUrl({
                access_type: 'offline',
                prompt: 'consent',
                scope: scopes
            });
        } catch (error) {
            console.error('[GoogleCalendar] Failed to generate auth URL:', error.message);
            return null;
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    static async getTokensFromCode(code) {
        try {
            const { google } = require('googleapis');
            
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );
            
            const { tokens } = await oauth2Client.getToken(code);
            
            return {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: tokens.expiry_date,
                scope: tokens.scope,
                token_type: tokens.token_type
            };
        } catch (error) {
            console.error('[GoogleCalendar] Failed to get tokens:', error.message);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken() {
        try {
            if (!this.oauth2Client) {
                throw new Error('OAuth client not initialized');
            }
            
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            
            return {
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token,
                expires_at: credentials.expiry_date
            };
        } catch (error) {
            console.error('[GoogleCalendar] Failed to refresh token:', error.message);
            throw error;
        }
    }

    /**
     * Get list of user's calendars
     */
    async getCalendarList() {
        try {
            const response = await this.calendar.calendarList.list();
            return response.data.items || [];
        } catch (error) {
            console.error('[GoogleCalendar] Failed to get calendar list:', error.message);
            throw error;
        }
    }

    /**
     * Get primary calendar ID
     */
    async getPrimaryCalendar() {
        try {
            const response = await this.calendar.calendars.get({ calendarId: 'primary' });
            return response.data;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to get primary calendar:', error.message);
            throw error;
        }
    }

    /**
     * Create a calendar event
     */
    async createEvent(event) {
        try {
            const resource = {
                summary: event.title,
                description: event.description || '',
                start: {
                    dateTime: event.start_time,
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: event.end_time,
                    timeZone: 'UTC'
                },
                location: event.location || '',
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 30 }
                    ]
                }
            };

            // Add attendees if provided
            if (event.attendees && event.attendees.length > 0) {
                resource.attendees = event.attendees.map(email => ({ email }));
            }

            // Add video conference link if provided
            if (event.conference_data) {
                resource.conferenceData = event.conference_data;
            }

            const response = await this.calendar.events.insert({
                calendarId: event.calendar_id || 'primary',
                resource,
                conferenceDataVersion: event.conference_data ? 1 : 0
            });

            return response.data;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to create event:', error.message);
            throw error;
        }
    }

    /**
     * Update a calendar event
     */
    async updateEvent(eventId, event, calendarId = 'primary') {
        try {
            const resource = {
                summary: event.title,
                description: event.description || '',
                start: {
                    dateTime: event.start_time,
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: event.end_time,
                    timeZone: 'UTC'
                },
                location: event.location || ''
            };

            const response = await this.calendar.events.patch({
                calendarId,
                eventId,
                resource
            });

            return response.data;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to update event:', error.message);
            throw error;
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteEvent(eventId, calendarId = 'primary') {
        try {
            await this.calendar.events.delete({
                calendarId,
                eventId
            });
            return true;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to delete event:', error.message);
            throw error;
        }
    }

    /**
     * Get events from calendar within a time range
     */
    async getEvents(timeMin, timeMax, calendarId = 'primary') {
        try {
            const response = await this.calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 2500
            });

            return response.data.items || [];
        } catch (error) {
            console.error('[GoogleCalendar] Failed to get events:', error.message);
            throw error;
        }
    }

    /**
     * Get a single event by ID
     */
    async getEvent(eventId, calendarId = 'primary') {
        try {
            const response = await this.calendar.events.get({
                calendarId,
                eventId
            });
            return response.data;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to get event:', error.message);
            throw error;
        }
    }

    /**
     * Watch for calendar changes (webhooks)
     */
    async watchCalendar(webhookUrl, calendarId = 'primary') {
        try {
            const response = await this.calendar.events.watch({
                calendarId,
                requestBody: {
                    id: `casebridge-${Date.now()}`,
                    type: 'web_hook',
                    address: webhookUrl
                }
            });
            return response.data;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to watch calendar:', error.message);
            throw error;
        }
    }

    /**
     * Stop watching a calendar
     */
    async stopWatch(channelId, resourceId) {
        try {
            await this.calendar.channels.stop({
                requestBody: {
                    id: channelId,
                    resourceId
                }
            });
            return true;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to stop watch:', error.message);
            throw error;
        }
    }

    /**
     * Get user info
     */
    async getUserInfo() {
        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const response = await oauth2.userinfo.get();
            return response.data;
        } catch (error) {
            console.error('[GoogleCalendar] Failed to get user info:', error.message);
            throw error;
        }
    }
}

module.exports = { GoogleCalendarService };

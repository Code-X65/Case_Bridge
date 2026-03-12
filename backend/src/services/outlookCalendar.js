/**
 * Outlook Calendar Service
 * Handles OAuth, event synchronization, and calendar operations with Microsoft Outlook
 */

class OutlookCalendarService {
    constructor(credentials) {
        this.credentials = credentials;
        this.client = null;
        this._initializeClient();
    }

    _initializeClient() {
        try {
            const { Client } = require('@microsoft/microsoft-graph-client');
            
            this.client = Client.init({
                authProvider: (done) => {
                    done(null, this.credentials.access_token);
                }
            });
        } catch (error) {
            console.error('[OutlookCalendar] Failed to initialize:', error.message);
        }
    }

    /**
     * Generate OAuth URL for authorization
     */
    static getAuthUrl() {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        
        const scopes = [
            'Calendars.ReadWrite',
            'User.Read',
            'offline_access'
        ].join(' ');
        
        const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize` +
            `?client_id=${clientId}` +
            `&response_type=code` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_mode=query` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&state=${Date.now()}`;
        
        return authUrl;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async getTokensFromCode(code) {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('scope', 'Calendars.ReadWrite User.Read offline_access');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);
        params.append('grant_type', 'authorization_code');
        params.append('client_secret', clientSecret);
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get tokens: ${error}`);
        }
        
        const tokens = await response.json();
        
        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000),
            scope: tokens.scope,
            token_type: tokens.token_type
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken() {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        
        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('scope', 'Calendars.ReadWrite User.Read offline_access');
        params.append('refresh_token', this.credentials.refresh_token);
        params.append('grant_type', 'refresh_token');
        params.append('client_secret', clientSecret);
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh token: ${error}`);
        }
        
        const tokens = await response.json();
        
        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || this.credentials.refresh_token,
            expires_at: Date.now() + (tokens.expires_in * 1000)
        };
    }

    /**
     * Get list of user's calendars
     */
    async getCalendars() {
        try {
            const response = await this.client.api('/me/calendars').get();
            return response.value || [];
        } catch (error) {
            console.error('[OutlookCalendar] Failed to get calendars:', error.message);
            throw error;
        }
    }

    /**
     * Get primary calendar
     */
    async getPrimaryCalendar() {
        try {
            const response = await this.client.api('/me/calendar').get();
            return response;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to get primary calendar:', error.message);
            throw error;
        }
    }

    /**
     * Create a calendar event
     */
    async createEvent(event) {
        try {
            const eventData = {
                subject: event.title,
                body: {
                    contentType: 'HTML',
                    content: event.description || ''
                },
                start: {
                    dateTime: event.start_time,
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: event.end_time,
                    timeZone: 'UTC'
                },
                location: event.location ? {
                    displayName: event.location
                } : undefined,
                isOnlineMeeting: event.is_online_meeting || false,
                onlineMeetingProvider: event.online_meeting_provider || 'teamsForBusiness'
            };

            // Add attendees if provided
            if (event.attendees && event.attendees.length > 0) {
                eventData.attendees = event.attendees.map(email => ({
                    emailAddress: { address: email },
                    type: 'required'
                }));
            }

            const response = await this.client.api('/me/events').post(eventData);
            return response;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to create event:', error.message);
            throw error;
        }
    }

    /**
     * Update a calendar event
     */
    async updateEvent(eventId, event) {
        try {
            const eventData = {
                subject: event.title,
                body: {
                    contentType: 'HTML',
                    content: event.description || ''
                },
                start: {
                    dateTime: event.start_time,
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: event.end_time,
                    timeZone: 'UTC'
                }
            };

            if (event.location) {
                eventData.location = { displayName: event.location };
            }

            const response = await this.client.api(`/me/events/${eventId}`).patch(eventData);
            return response;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to update event:', error.message);
            throw error;
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteEvent(eventId) {
        try {
            await this.client.api(`/me/events/${eventId}`).delete();
            return true;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to delete event:', error.message);
            throw error;
        }
    }

    /**
     * Get events from calendar within a time range
     */
    async getEvents(timeMin, timeMax) {
        try {
            const response = await this.client.api('/me/events')
                .filter(`start/dateTime ge '${timeMin}' and end/dateTime le '${timeMax}'`)
                .select('id,subject,body,start,end,location,attendees,isOnlineMeeting,onlineMeetingProvider')
                .orderby('start/dateTime')
                .get();
            
            return response.value || [];
        } catch (error) {
            console.error('[OutlookCalendar] Failed to get events:', error.message);
            throw error;
        }
    }

    /**
     * Get a single event by ID
     */
    async getEvent(eventId) {
        try {
            const response = await this.client.api(`/me/events/${eventId}`).get();
            return response;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to get event:', error.message);
            throw error;
        }
    }

    /**
     * Get user info
     */
    async getUserInfo() {
        try {
            const response = await this.client.api('/me').get();
            return response;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to get user info:', error.message);
            throw error;
        }
    }

    /**
     * Subscribe to calendar changes (webhooks)
     */
    async subscribeToCalendar(webhookUrl) {
        try {
            const subscription = {
                changeType: 'created,updated,deleted',
                notificationUrl: webhookUrl,
                resource: '/me/events',
                expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // ~3 days max
                clientState: `casebridge-${Date.now()}`
            };

            const response = await this.client.api('/subscriptions').post(subscription);
            return response;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to subscribe:', error.message);
            throw error;
        }
    }

    /**
     * Unsubscribe from calendar changes
     */
    async unsubscribe(subscriptionId) {
        try {
            await this.client.api(`/subscriptions/${subscriptionId}`).delete();
            return true;
        } catch (error) {
            console.error('[OutlookCalendar] Failed to unsubscribe:', error.message);
            throw error;
        }
    }
}

module.exports = { OutlookCalendarService };

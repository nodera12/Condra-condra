export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  labelIds: string[];
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText: string;
  bodyHtml: string;
  headers: Record<string, string>;
}

// Decode base64url to UTF-8 text safely
export function decodeBase64Url(base64UrlData: string): string {
  try {
    const base64 = base64UrlData.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    // Convert byte array to utf-8 string
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    try {
      return atob(base64UrlData.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return '';
    }
  }
}

// Encode UTF-8 string to base64url
export function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binStr = '';
  for (let i = 0; i < bytes.length; i++) {
    binStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Extract body parts recursively
function extractBodyParts(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    text += decodeBase64Url(payload.body.data);
  } else if (payload.mimeType === 'text/html' && payload.body?.data) {
    html += decodeBase64Url(payload.body.data);
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const extracted = extractBodyParts(part);
      if (extracted.text) text += (text ? '\n' : '') + extracted.text;
      if (extracted.html) html += (html ? '<br/>' : '') + extracted.html;
    }
  }

  return { text, html };
}

export const gmailApi = {
  // 1. Get user profile
  async getProfile(accessToken: string): Promise<GmailProfile> {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to fetch Gmail profile (Status ${res.status})`);
    }

    return res.json();
  },

  // 2. List message IDs
  async listMessages(
    accessToken: string,
    options?: {
      maxResults?: number;
      q?: string;
      pageToken?: string;
      labelIds?: string[];
    }
  ): Promise<{ messages: { id: string; threadId: string }[]; nextPageToken?: string; resultSizeEstimate?: number }> {
    const params = new URLSearchParams();
    params.set('maxResults', String(options?.maxResults || 20));
    if (options?.q) params.set('q', options.q);
    if (options?.pageToken) params.set('pageToken', options.pageToken);
    if (options?.labelIds && options.labelIds.length > 0) {
      options.labelIds.forEach((lbl) => params.append('labelIds', lbl));
    }

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to list messages (Status ${res.status})`);
    }

    const data = await res.json();
    return {
      messages: data.messages || [],
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate,
    };
  },

  // 3. Get single message metadata & parsed summary
  async getMessage(accessToken: string, messageId: string): Promise<GmailMessageDetail> {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to get message ${messageId}`);
    }

    const data = await res.json();
    const headersList: GmailMessageHeader[] = data.payload?.headers || [];
    const headersMap: Record<string, string> = {};
    headersList.forEach((h) => {
      headersMap[h.name.toLowerCase()] = h.value;
    });

    const { text, html } = extractBodyParts(data.payload);
    const labelIds: string[] = data.labelIds || [];

    return {
      id: data.id,
      threadId: data.threadId,
      snippet: data.snippet || '',
      internalDate: data.internalDate || '',
      from: headersMap['from'] || 'Unknown Sender',
      to: headersMap['to'] || '',
      subject: headersMap['subject'] || '(No Subject)',
      date: headersMap['date'] || (data.internalDate ? new Date(Number(data.internalDate)).toLocaleString() : ''),
      isUnread: labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      labelIds,
      bodyText: text || data.snippet || '',
      bodyHtml: html || '',
      headers: headersMap,
    };
  },

  // 4. Batch fetch messages summaries
  async fetchBatchSummaries(
    accessToken: string,
    messageRefs: { id: string; threadId: string }[]
  ): Promise<GmailMessageSummary[]> {
    const promises = messageRefs.slice(0, 15).map(async (ref) => {
      try {
        const detail = await this.getMessage(accessToken, ref.id);
        return {
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet,
          internalDate: detail.internalDate,
          from: detail.from,
          to: detail.to,
          subject: detail.subject,
          date: detail.date,
          isUnread: detail.isUnread,
          isStarred: detail.isStarred,
          labelIds: detail.labelIds,
        };
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((m): m is GmailMessageSummary => m !== null);
  },

  // 5. Send an email
  async sendEmail(
    accessToken: string,
    payload: {
      to: string;
      subject: string;
      body: string;
      inReplyTo?: string;
      references?: string;
      threadId?: string;
    }
  ): Promise<{ id: string; threadId: string; labelIds: string[] }> {
    const rawLines = [
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
    ];

    if (payload.inReplyTo) {
      rawLines.push(`In-Reply-To: ${payload.inReplyTo}`);
    }
    if (payload.references) {
      rawLines.push(`References: ${payload.references}`);
    }

    rawLines.push('', payload.body);

    const emailRaw = rawLines.join('\r\n');
    const encodedRaw = encodeBase64Url(emailRaw);

    const requestBody: Record<string, any> = { raw: encodedRaw };
    if (payload.threadId) {
      requestBody.threadId = payload.threadId;
    }

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to send email (Status ${res.status})`);
    }

    return res.json();
  },

  // 6. Trash an email
  async trashMessage(accessToken: string, messageId: string): Promise<any> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to move message to trash.`);
    }

    return res.json();
  },

  // 7. Mark as Read or Unread / Star / Unstar
  async modifyMessage(
    accessToken: string,
    messageId: string,
    addLabelIds: string[] = [],
    removeLabelIds: string[] = []
  ): Promise<any> {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds,
        removeLabelIds,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Failed to modify message labels.');
    }

    return res.json();
  },
};

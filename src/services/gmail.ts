export interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;
  labelIds?: string[];
}
/**
 * Parses the "From" header of an email into separate name and email parts.
 * Example: "Google Alerts <googlealerts-noreply@google.com>" 
 * becomes { name: "Google Alerts", email: "googlealerts-noreply@google.com" }
 */
export const parseSender = (fromHeader: string): { name: string; email: string } => {
  if (!fromHeader) return { name: 'Unknown Senders', email: '' };

  const emailMatch = fromHeader.match(/<([^>]+)>/);
  const email = emailMatch ? emailMatch[1].toLowerCase().trim() : fromHeader.trim().toLowerCase();
  
  let name = fromHeader.replace(/<[^>]+>/, '').trim();
  name = name.replace(/^["']|["']$/g, '').trim(); // Remove leading/trailing quotes
  
  if (!name) {
    name = email.split('@')[0];
  }
  
  return { name, email };
};

/**
 * Fetch a list of inbox message details
 */
export const fetchInboxEmails = async (
  accessToken: string,
  maxResults = 25
): Promise<GmailEmail[]> => {
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=label:INBOX`;
  
  try {
    const listResponse = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`Failed to fetch Gmail list: ${listResponse.statusText}. Details: ${errorText}`);
    }

    const listData = await listResponse.json();
    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    // Fetch individual email details in parallel
    const emailPromises = listData.messages.map(async (msg: { id: string }) => {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      
      const detailResponse = await fetch(detailUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!detailResponse.ok) {
        console.warn(`Could not fetch details for message ${msg.id}`);
        return null;
      }

      const detailData = await detailResponse.json();
      const headers: { name: string; value: string }[] = detailData.payload?.headers || [];
      
      const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown';
      const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
      
      const { name: fromName, email: fromEmail } = parseSender(fromHeader);

      return {
        id: detailData.id,
        threadId: detailData.threadId,
        from: fromHeader,
        fromEmail,
        fromName,
        subject,
        snippet: detailData.snippet || '',
        date,
        labelIds: detailData.labelIds || [],
      } as GmailEmail;
    });

    const results = await Promise.all(emailPromises);
    return results.filter((email): email is GmailEmail => email !== null);
  } catch (error) {
    console.error('Error fetching inbox emails:', error);
    throw error;
  }
};

/**
 * Perform batch modify operation
 */
const batchModify = async (
  accessToken: string,
  ids: string[],
  addLabelIds: string[],
  removeLabelIds: string[]
): Promise<boolean> => {
  if (ids.length === 0) return true;
  
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids,
        addLabelIds,
        removeLabelIds,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gmail batch action failed: ${response.statusText}. Details: ${errText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error performing batch operation:', error);
    throw error;
  }
};

/**
 * Archive a list of emails (removes from Inbox)
 */
export const archiveEmails = async (accessToken: string, ids: string[]): Promise<boolean> => {
  return batchModify(accessToken, ids, [], ['INBOX']);
};

/**
 * Trash a list of emails (moves to Trash, removes from Inbox)
 */
export const deleteEmails = async (accessToken: string, ids: string[]): Promise<boolean> => {
  return batchModify(accessToken, ids, ['TRASH'], ['INBOX']);
};

/**
 * Mark a list of emails as read (removes UNREAD label)
 */
export const markEmailsAsRead = async (accessToken: string, ids: string[]): Promise<boolean> => {
  return batchModify(accessToken, ids, [], ['UNREAD']);
};

/**
 * Create a permanent filter in Gmail for a specific sender email
 */
export const createGmailFilter = async (
  accessToken: string,
  fromEmail: string,
  action: 'archive' | 'delete' | 'read'
): Promise<boolean> => {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters`;
  
  const removeLabelIds: string[] = [];
  const addLabelIds: string[] = [];

  if (action === 'archive') {
    removeLabelIds.push('INBOX');
  } else if (action === 'read') {
    removeLabelIds.push('UNREAD');
  } else if (action === 'delete') {
    addLabelIds.push('TRASH');
  }

  const filterRule = {
    criteria: {
      from: fromEmail,
    },
    action: {
      removeLabelIds: removeLabelIds.length > 0 ? removeLabelIds : undefined,
      addLabelIds: addLabelIds.length > 0 ? addLabelIds : undefined,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filterRule),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gmail filter creation failed: ${response.statusText}. Details: ${errText}`);
    }

    return true;
  } catch (error) {
    console.error('Error creating Gmail filter:', error);
    throw error;
  }
};

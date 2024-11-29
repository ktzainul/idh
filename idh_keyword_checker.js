(function() {
    'use strict';

    // Base64 encoded S3 URLs
    const S3_BUCKET_URL = atob('aHR0cHM6Ly9sbWFxaWRoLnMzLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL3NjcmlwdF9sb2dzLw==');
    const KEYWORDS_URL = atob('aHR0cHM6Ly9sbWFxaWRoLnMzLnVzLWVhc3QtMS5hbWF6b25hd3MuY29tL2FidXNpdmVfa2V5d29yZHMudHh0');

    let keywords = [];
    let totalAbusiveKeywords = 0;

    const getUserId = () => document.querySelector('.a-profile-name')?.textContent.trim() || 'unknown';
    const getAID = () => document.querySelector('#AID')?.textContent.trim() || 'unknown';
    const getDeliveryHint = () => document.getElementById('Delivery Hint')?.textContent.trim() || '';

    const findAbusiveKeywords = (text) => {
        if (!text || keywords.length === 0) return [];
        const escapedKeywords = keywords.map(keyword =>
            keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
        const regex = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');
        const matches = text.match(regex) || [];
        totalAbusiveKeywords = matches.length;
        return matches;
    };

    const sendLogToS3 = () => {
        const logData = {
            aid: getAID(),
            userId: getUserId(),
            timestamp: new Date().toISOString(),
            auditUrl: window.location.href,
            deliveryHint: getDeliveryHint(),
            abusiveKeywordsCount: totalAbusiveKeywords,
            abusiveKeywordsFound: findAbusiveKeywords(getDeliveryHint())
        };

        const currentDate = new Date().toISOString().split('T')[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${currentDate}/${getUserId()}_${timestamp}.json`;

        GM_xmlhttpRequest({
            method: 'PUT',
            url: S3_BUCKET_URL + fileName,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(logData, null, 2),
            onload: (response) => console.log('Log sent to S3:', response.status === 200 ? 'Success' : 'Failed'),
            onerror: (error) => console.error('Error sending log to S3:', error)
        });
    };

    const fetchKeywords = () => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: KEYWORDS_URL,
            headers: { 'Accept': 'text/plain' },
            onload: (response) => {
                if (response.status === 200) {
                    keywords = response.responseText.split('\n').map(kw => kw.trim()).filter(Boolean);
                    console.log('Keywords loaded:', keywords.slice(0, 5));
                } else {
                    console.error('Error loading keywords:', response.statusText);
                }
            },
            onerror: (error) => console.error('Failed to fetch keywords:', error)
        });
    };

    const highlightKeywords = () => {
        const deliveryHintElement = document.getElementById('Delivery Hint');
        if (!deliveryHintElement || keywords.length === 0) return;

        const text = deliveryHintElement.textContent;
        const regex = new RegExp(`\\b(${keywords.map(kw => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
        const matches = text.match(regex) || [];

        deliveryHintElement.innerHTML = text.replace(regex, match => `<span style="background-color: lightcoral;">${match}</span>`);
        totalAbusiveKeywords = matches.length;
    };

    const initializeScript = () => {
        fetchKeywords();
        document.addEventListener('DOMContentLoaded', highlightKeywords);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeScript);
    } else {
        initializeScript();
    }
})();

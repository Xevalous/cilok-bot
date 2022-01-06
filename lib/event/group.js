/* global client database */
client.ev.on('groups.update', async (group) => {
    if (database.group[group[0].id]) {
        database.group[group[0].id].subject = group[0].subject;
    }
});

When evolving the product:
Main guideline: The main part now is to add a backend layer of persistance to the project so that we can have:
SPRINT NAME: BACKEND TO SAVE USER SESSIONS
- users that authenticate in the app
- save some things in the user such as dream journal entries (basically just a table called entries that have a kind to see what it was and a text)
So we need a simple backend engine that goes together with this project in a simple monolyth structure, one deploy for everything
- Logging in should save the main information we have in the cookies in the user session such as birth date, birth time, birth place and full name (fetched in numerology)

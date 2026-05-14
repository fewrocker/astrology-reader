SPRINT NAME: BACKEND SOVEREIGNTY

This app has started doing all the calculations of astrological system on the front-end.
This makes some information only live on the client and not be on the server, so when gpt calls are made for example, they dont have the front end context.
Now, this will be a more serious production used app and therefore the backend needs to be the center of all logic

Check commit fe51ab02945b61cc83b18fb7931cc362c5608155 to see the work that was done of bringing some calculations to the backend to be server correctly on the dream journals.

The MAIN GOAL of this sprint is: Bring EVERY SINGLE calculation script to the backend so the backend centers the logics of calculations and is able to arrive at the data that the frontend arrives. In order to have instantaneous frontend calculation, since it is all .js files and calculations, the front end can have access to do instantaneous calculations, yet the backend can do them too. Make the backend sovereign whenever it is important. Of course leverage the best of both worlds and keep thigns on the front end to speed things up on UI/UX, but just make sure things live were they should. Refactor what is needed to send the responsibilities to correct places between backend and frontend.
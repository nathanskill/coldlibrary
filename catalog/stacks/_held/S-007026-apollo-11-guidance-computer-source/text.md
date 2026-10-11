## Luminary 099 (Lunar Module) — BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc

```
# BURN, BABY, BURN -- MASTER IGNITION ROUTINE

                BANK    36
                SETLOC  P40S
                BANK
                EBANK=  WHICH
                COUNT*  $$/P40

# THE MASTER IGNITION ROUTINE IS DESIGNED FOR USE BY THE FOLLOWING LEM PROGRAMS:  P12, P40, P42, P61, P63.
# IT PERFORMS ALL FUNCTIONS IMMEDIATELY ASSOCIATED WITH APS OR DPS IGNITION:  IN PARTICULAR, EVERYTHING LYING
# BETWEEN THE PRE-IGNITION TIME CHECK -- ARE WE WITHIN 45 SECONDS OF TIG? -- AND TIG + 26 SECONDS, WHEN DPS
# PROGRAMS THROTTLE UP.
#
# VARIATIONS AMONG PROGRAMS ARE ACCOMODATED BY MEANS OF TABLES CONTAINING CONSTANTS (FOR AVEGEXIT, FOR
# WAITLIST, FOR PINBALL) AND TCF INSTRUCTIONS.  USERS PLACE THE ADRES OF THE HEAD OF THE APPROPRIATE TABLE
# (OF P61TABLE FOR P61LM, FOR EXAMPLE) IN ERASABLE REGISTER `WHICH' (E4).  THE IGNITION ROUTINE THEN INDEXES BY
# WHICH TO OBTAIN OR EXECUTE THE PROPER TABLE ENTRY.  THE IGNITION ROUTINE IS INITIATED BY A TCF BURNBABY,
# THROUGH BANKJUMP IF NECESSARY.  THERE IS NO RETURN.
#
# THE MASTER IGNITION ROUTINE WAS CONCEIVED AND EXECUTED, AND (NOTA BENE) IS MAINTAINED BY ADLER AND EYLES.
#
#                  HONI SOIT QUI MAL Y PENSE
#
#       ***********************************************
#               TABLES FOR THE IGNITION ROUTINE
#       ***********************************************
#
#                       NOLI SE TANGERE
```

## Luminary 099 (Lunar Module) — BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc

```
P40A/P          TC      BANKCALL        # SUBROUTINE TO CHECK PGNCS CONTROL
                CADR    G+N,AUTO        # AND AUTO STABILIZATION MODES
                CCS     A               # +0 INDICATES IN PGNCS, IN AUTO
                TCF     TURNITON        # + INDICATES NOT IN PGNCS AND/OR AUTO
                CAF     APSFLBIT        # ARE WE ON THE DESCENT STAGE?
                MASK    FLGWRD10
                CCS     A
                TCF     GOBACK          # RETURN
                CAF     BIT5            # YES, CHECK FOR AUTO-THROTTLE MODE
                EXTEND
                RAND    CHAN30
                EXTEND
                BZF     GOBACK          # IN AUTO-THROTTLE MODE -- RETURN
TURNITON        CAF     P40A/PMD        # DISPLAYS V50N25 R1=203 PLEASE PERFORM
                TC      BANKCALL        # CHECKLIST 203 TURN ON PGNCS ETC.
                CADR    GOPERF1
                TCF     GOTOPOOH        # V34E TERMINATE
                TCF     P40A/P          # RECYCLE
GOBACK          CA      TEMPR60
                TC      BANKJUMP        # GOODBYE.  COME AGAIN SOON.
```

## Luminary 099 (Lunar Module) — THE_LUNAR_LANDING.agc

```
P63SPOT3        CA      BIT6            # IS THE LR ANTENNA IN POSITION 1 YET
                EXTEND
                RAND    CHAN33
                EXTEND
                BZF     P63SPOT4        # BRANCH IF ANTENNA ALREADY IN POSITION 1

                CAF     CODE500         # ASTRONAUT:    PLEASE CRANK THE
                TC      BANKCALL        #               SILLY THING AROUND
                CADR    GOPERF1
                TCF     GOTOPOOH        # TERMINATE
                TCF     P63SPOT3        # PROCEED       SEE IF HE'S LYING

P63SPOT4        TC      BANKCALL        # ENTER         INITIALIZE LANDING RADAR
                CADR    SETPOS1

                TC      POSTJUMP        # OFF TO SEE THE WIZARD...
                CADR    BURNBABY
```

## Luminary 099 (Lunar Module) — LUNAR_LANDING_GUIDANCE_EQUATIONS.agc

```
                CAF     TWO             # WCHPHASE = 2 ---> VERTICAL: P65,P66,P67
                TS      WCHPHOLD
                TS      WCHPHASE
                TC      BANKCALL        # TEMPORARY, I HOPE HOPE HOPE
                CADR    STOPRATE        # TEMPORARY, I HOPE HOPE HOPE
                TC      DOWNFLAG        # PERMIT X-AXIS OVERRIDE
                ADRES   XOVINFLG
                TC      DOWNFLAG
                ADRES   REDFLAG
                TCF     VERTGUID
```

## Luminary 099 (Lunar Module) — PINBALL_GAME_BUTTONS_AND_LIGHTS.agc

```
# THE FOLLOWING QUOTATION IS PROVIDED THROUGH THE COURTESY OF THE AUTHORS.
#
#       ::IT WILL BE PROVED TO THY FACE THAT THOU HAST MEN ABOUT THEE THAT
# USUALLY TALK OF A NOUN AND A VERB, AND SUCH ABOMINABLE WORDS AS NO
# CHRISTIAN EAR CAN ENDURE TO HEAR.::
#                                       HENRY 6, ACT 2, SCENE 4
```

## Comanche 055 (Command Module) — ALARM_AND_ABORT.agc

```
                CA      V37FLBIT        # IS AVERAGE G ON
                MASK    FLAGWRD7
                CCS     A
                TC      WHIMPER -1      # YES.  DONT DO POODOO.  DO BAILOUT.
```

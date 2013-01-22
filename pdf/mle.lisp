;;; Look at the MLE estimator of conditional probability for a discrete
;;; distribution.  Mainly I just wanted to confirm that this is unbiased
;;; even for conditional probability, as claimed in the handout.  
;;; (It seems to be, and I think the proof won't be hard, but I did
;;; this sanity check first.)
;;; 
;;; In computing the bias, variance, and MSE, I ignored samples where the 
;;; estimator was undefined because the denominator was 0.
;;;
;;; Distribution is some distribution over the integers 0, 1, 2.
;;; The conditional probability to estimate is p(0 | 0 or 1).
;;; This should be fully general for finite discrete distributions.

(defun distrib ()    ; distribution over 3 events
  (loop repeat 3 
	for p = (random 1.0) 
	collect p into dist 
	sum p into s 
	finally (return (mapcar #'(lambda (p) (/ p s)) dist))))

(defun sample (distrib n)   ; sample n events from a distribution over k events
  (loop repeat n 
	collect (loop with x = (random 1.0) 
		      for p in distrib 
		      for i from 0 
		      sum p into s 
		      if (< x s) return i)))

(defun estimate (sample)    ; given a sample of events, estimate conditional probability p(0 | 0 or 1) -- return nil if undefined
  (loop for i in sample 
	count (= i 0) into num 
	count (<= i 1) into denom 
	finally (return (if (zerop denom) 
			    nil 
			  (float (/ num denom))))))

(defun trueprob (distrib)    ; the true conditional probability p(0 | 0 or 1)
  (/ (first distrib) (+ (first distrib) (second distrib))))

(defun square (x) (* x x))

(defun test (distrib n m)    ; compute m estimates, each from a sample of size n, and report results
  (loop with trueprob = (trueprob distrib) 
	for tries from 1 
	for estimate = (estimate (sample distrib n)) 
	when estimate    ; skip nil (the 0/0 estimate)
	sum 1 into runs 
	and sum estimate into total 
	and sum (square estimate) into sqtotal 
	and sum (square (- estimate trueprob)) into sqetotal 
	while (< runs m) 
	finally (format t "~&~A samples from distrib ~A so that true p(0 | 0 or 1) = ~A~&Based on ~A successful runs (of ~A tries):~&mean estimate = ~A, bias = ~A, variance = ~A, mse = ~A" 
			n distrib trueprob runs tries 
			(/ total runs) 
			(- (/ total runs) trueprob) 
			(- (/ sqtotal runs) (square (/ total runs)))
			(/ sqetotal runs))))

(loop for d in (cons '(.49 .01 .5) (loop repeat 4 collect (distrib)))
      do (terpri)
      do (loop for n in '(1 2 10 100)
	       do (test d n 1000000)))

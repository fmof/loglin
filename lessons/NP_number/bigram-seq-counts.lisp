;;; Sample text from a bigram model over shapes, for Lesson 16.

;;; Some weights produced by rnorm(16,sd=0.5) in R
(defvar unigram-weights 
   (make-array 16 :initial-contents 
	       '(-0.105317995  0.307595769  0.028199139 -0.042511120  0.389801685
                 -0.089365452  0.644397286 -0.519736645  0.508685880 -0.327199714
                 -0.302943500 -0.003830292  0.017110161  0.671993754  0.416292142
                 -0.113442152)))

;;; Unnormalized probability, which uses the weights above
;;; as well as some bigram weights that are hardcoded below.
;;; An event is a pair in {1,2,3}x{1,2,3}.  We use 0 for backoff.
(defun u (y1 y2 x1 x2)   
  (exp (+ (if (and (= y1 x1) (= y2 x2)) 0.5 0)   ; theta_{same event} = 0.5
	  (if (= y1 x1) 1.0 0)                   ; theta_{same shape} = 1
	  (if (= y2 x2) -0.25 0)                 ; theta_{same fill} = -0.25
	  (aref unigram-weights (+ (* 4 y1) y2))
	  (aref unigram-weights (+ (* 4 y1) 0))
	  (aref unigram-weights (+ (* 4 0 ) y2)))))

;;; one sample from context x1 x2
(defun sample (x1 x2)
  (loop with z = (loop for y1 from 1 to 3
		       sum (loop for y2 from 1 to 3
				 sum (u y1 y2 x1 x2)))
	with r = (random z)
	with s = 0
	for y1 from 1 to 3
	thereis (loop for y2 from 1 to 3
		      do (incf s (u y1 y2 x1 x2))
		      if (>= s r)
		      do (return (list y1 y2)))))

;;; Generate a bunch of "text" from a bigram model, starting in a given context x1 x2.
;;; Add the counts to array a[x1,x2,y1,y2] and return array a.
(defun seqcounts (n &optional (x1 1) (x2 1) (a (make-array '(4 4 4 4) :initial-element 0)))
  (loop repeat n
	for y = (sample x1 x2)
	for y1 = (first y)
	for y2 = (second y)
	do (incf (aref a x1 x2 y1 y2))
	do (setf x1 y1 x2 y2)
	finally (return a)))


;;; Print the final counts in an order so that they can be pasted into the observations file.
;;; (would be better just to print the observations file)
(defun main (n)
  (loop with samples = (seqcounts n)
	for x1 from 1 to 3
	do (loop for x2 from 1 to 3
		 do (loop for y1 from 1 to 3
			  do (loop for y2 from 1 to 3
				   do (print (aref samples x1 x2 y1 y2)))))))
